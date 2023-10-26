const parseStringValue = (stringValue) => {
  const floatValue = parseFloat(stringValue);
  const intValue = parseInt(stringValue);

  if (!isNaN(floatValue) && floatValue === intValue) {
    return intValue;  // If it's an integer, return as integer
  } else if (!isNaN(floatValue)) {
    return floatValue;  // If it's a float, return as float
  } else {
    // If parsing as float fails, return as string

    // Check if the string is enclosed in single or double quotes
    if ((stringValue.startsWith("'") && stringValue.endsWith("'")) ||
      (stringValue.startsWith('"') && stringValue.endsWith('"'))) {
      stringValue = stringValue.slice(1, -1); // Remove quotes
    }
    // original profiles used 'nil', changing it to null
    // per the json spec
    if (stringValue === 'nil') {
      stringValue = null;
    }

    return stringValue;
  }
}


const parseBedShape = (stringValue) => {
  return stringValue.split(',').map((pointSet) => {
    if (pointSet.includes('-') && !pointSet.includes('x')) {
      // currently there is one profile that uses '-' instead of 'x' to separate the points
      // on one value of the bedshape
      // I'm told that can be used to denote a diag line
      return pointSet.split('-').map((numberValue) => {
        return parseFloat(numberValue);
      });
    } else {
      return pointSet.split('x').map((numberValue) => {
        return parseFloat(numberValue);
      });
    }
  });
}

const parseGcodeString = (stringValue) => {
  // remove any escape quotes
  stringValue = stringValue.replace(/\\"/g, '');
  // split the string into lines of gcode;
  const gcodeLines = stringValue.split('\\n');
  // remove empty strings from the result
  return gcodeLines.filter(str => str !== "");
}

const isGcodeValue = (key) => {
  return (key === "start_gcode" || key === "pause_gcode" || key === "color_change_gcode" || key === "end_gcode" || key === "before_layer_gcode" || key === "after_layer_gcode" || key === "layer_gcode" || key === "toolchange_gcode" || key === "end_filament_gcode" || key === "start_filament_gcode");
}

const isValidKeyValuePair = (key, stringValue) => {
  return (key !== "" && stringValue !== "" && !key.startsWith('#') && key !== "renamed_from");
}

const path = require('path');

const getManufacturerFromFileName = (fileName) => {
  const pathSegments = fileName.split(path.sep);
  return pathSegments[pathSegments.length - 1].split('.')[0].toLowerCase();
}

const commonIdentifierToValenceIdentifier = (profile, category, mfg) => {
  if (profile.startsWith('*') && profile.endsWith('*')) {
    return profile.trim().substring(1, profile.length - 1).toLowerCase();
  } else {
    return profile.toLowerCase();
  }
}

const renameFilamentProfile = (profile) => {
  return profile
  .split(" ")
  .map(word => {
    const cleanedWord = word
      .toLowerCase()
      .replace(/\(|\)/g, '')
      .replace(/\//g, '-');
    return cleanedWord === '-' ? '' : cleanedWord; // Remove any standalone dashes
  })
  .filter(Boolean) // Remove any empty strings
  .join('_');
}

module.exports = {
  parseBedShape,
  parseGcodeString,
  parseStringValue,
  isGcodeValue,
  isValidKeyValuePair,
  renameFilamentProfile,
  getManufacturerFromFileName,
  commonIdentifierToValenceIdentifier
}
