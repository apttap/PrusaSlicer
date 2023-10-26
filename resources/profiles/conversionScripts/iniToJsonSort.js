// Assuming 'iniData' contains your .ini file content as a string
const path = require('path');
const fs = require('fs');
const {
  parseBedShape,
  parseGcodeString,
  parseStringValue,
  isGcodeValue,
  isValidKeyValuePair,
  getManufacturerFromFileName,
  commonIdentifierToValenceIdentifier,
  renameFilamentProfile
} = require('./utilities');

const readDir = (dir, files = []) => {
  fs.readdirSync(dir).forEach(file => {
    // if it's an .ini file, convert it to json
    if (path.extname(file) === '.ini') {
      // convert .ini to json
      const json = iniToJson(path.join(dir, file));
    }
  })
};

const writeToFile = (category, profile, json, mfg) => {
  // write json to file
  // directory structure is as follows:
  // [MFG]/
  // - vendor.json
  // - printers/
  // - - common/
  // - - [printerName].json
  // - models/
  // - - common/
  // - - [modelName].json
  // - material_presets/
  // - - common/
  // - - [materialPresetName].json
  // - print_presets/
  // - - common/
  // - - [printPresetName].json
  // if (category === 'printer') {
  //   console.log(profile);
  //   console.log(json);
  // }
  if (category === 'vendor') {
    const directory = path.join(__dirname, '../../profiles/testing', mfg);
    const fileName = path.join(directory, 'vendor.json');
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(fileName, JSON.stringify(json, null, 2));
  } else if (profile && category) {
    // // Handle common printer profiles
    if (profile.startsWith('*') && profile.endsWith('*')) {
      const newProfile = commonIdentifierToValenceIdentifier(profile, category, mfg);
      const directory = path.join(__dirname, '../../profiles/testing', mfg, category, 'common');
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(path.join(directory, `${newProfile}.json`), JSON.stringify(json, null, 2));
    } else {
      // Handle specific printer profiles

      let newProfile = profile;

      if (category === 'filament' || category === 'sla_material') {
        newProfile = renameFilamentProfile(profile);
      }

      const directory = path.join(__dirname, '../../profiles/testing', mfg, category);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(path.join(directory, `${newProfile}.json`), JSON.stringify(json, null, 2));
    }
  }
};

// convert .ini to jsoncd co
const iniToJson = (file) => {

  const mfg = getManufacturerFromFileName(file);

  // read the ini
  const iniData = fs.readFileSync(file, 'utf-8');

  const profileHeaders = iniData.match(/^\[([^\]]+)\]$/gm); // Match all headers

  if (profileHeaders) {
    for (let i = 0; i < profileHeaders.length; i++) {
      const startIndex = iniData.indexOf(profileHeaders[i]);
      const endIndex = (i + 1 < profileHeaders.length) ? iniData.indexOf(profileHeaders[i + 1]) : iniData.length;
      const profileData = iniData.substring(startIndex, endIndex).trim();

      // split the profile into lines /r and /n agnostic
      // (windows vs linux line endings);
      const lines = profileData.split(/\r?\n/);
      // create an object to hold the profile
      const result = {};

      let currentCategory = null;
      let currentProfile = null;

      // iterate through the lines
      lines.forEach((line) => {
        // match the [header] lines again against the regex
        // this should be the first line of the section,
        // might skip this but probably safer this way
        const slic3rProfileHeader = line.match(/^\[([^\]]+)\]$/);
        if (slic3rProfileHeader) {
          const [category, profileName] = slic3rProfileHeader[1].split(':');
          currentCategory = category;
          currentProfile = profileName;
        } else {
          const parts = line.split('=');
          const key = parts[0].trim();
          const stringValue = parts.slice(1).join('=').trim();
          if (isValidKeyValuePair(key, stringValue)) {
            // printer profile fields
            if (key === 'compatible_printers_condition') {
              // TODO: process this value
            } else if (key === "bed_shape") {
              result[key] = parseBedShape(stringValue);
            } else if (isGcodeValue(key)) {
              result[key] = parseGcodeString(parseStringValue(stringValue));
            } else if (key === 'inherits') {
              result[key] = stringValue.split(';').map((profile) => {
                let newProfile = commonIdentifierToValenceIdentifier(profile.trim(), currentCategory, mfg);
                if (currentCategory === 'filament' || currentCategory === 'sla_material') {
                  return renameFilamentProfile(newProfile);
                } else {
                  return newProfile;
                }
              });
            } else if (key === 'printer_notes') {
              // split the printer notes into an array of
              // compatibility tags
              // TODO: perhaps the key of this should be
              // "compatibility_tags"
              // "printer notes" is a bit general and
              // doesn't really describe what this is
              // there is also a "notes" field on the printers
              // for user notes

              result[key] = stringValue.split('\\n').slice(1);
            }
            // printer_model profile fields
            else if (key === 'default_materials') {
              result[key] = stringValue.split(';').map((material) => material.trim());
            } else if (key === 'variants') {
              result[key] = stringValue.split(',').map((variant) => parseStringValue(variant.trim()));
            }
            else {
              result[key] = parseStringValue(stringValue);
            }
          }
        }
      });

      writeToFile(currentCategory, currentProfile, result, mfg);
    }
  }

};


const dir = path.join(__dirname, '../../profiles');
readDir(dir);