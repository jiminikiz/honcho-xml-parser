// streaming will be faster and more performant than loading the XML entirely in memory
const XmlStream = require('xml-stream');
const fs = require('fs');
const path = require('path');

// Potential CLI Params
// intentionally pulling these out -- could be passed in as CLI params if this script were primarily intended for CLI use.
const XML_PATH = path.join(__dirname, 'CodeTest-XML.xml');
const JSON_PATH = path.join(__dirname, 'CodeTest-XML.json');
const END_ELEMENT = 'Message';
const SCHEMA = new Set(['From', 'Message']);
const INVALID_VALUE_KEYS = ['script', '$text'];

// if the goal were to load this as a batch write operation (for DBs that support that feature)
// this stream could build one json object and write that once

// less preferably, but nicer on hardware, the script could also send multiple persist commands
// to the db as to not load the entire XML as a massive JSON object

// For now, the DB is just a local JSON file to get the idea across, this script would do well with
// a DB that natively supports writable streams
const jsonStream = fs.createWriteStream(JSON_PATH);

// Mock db save function
const db = {
  save: () => jsonStream.write(']') && jsonStream.end(),
};

// compare set function
const compareSets = (setA, setB) => {
  // sets of not the same size are not equal
  if(setA.size !== setB.size) return false;
  // check each element of the set
  for (let item of setA) {
    if (!setB.has(item)) return false;
  }
  // sets are equal
  return true;
}

// schema validator, skips values in the stream that we don't want to write
const isValidSchema = (elementSchema) => {
  const hasValidKeys = compareSets(SCHEMA, elementSchema);
  const hasValidValues = true;

  if(elementSchema.constructor === Object) {
    Object.keys(elementSchema).forEach((key) => {
      if(INVALID_VALUE_KEYS.includes(key)) {
        hasValidValues = false;
      }
    });
  }

  return hasValidKeys && hasValidValues;
}

// main function, scripts main logic
function Main() {
  const stream = fs.createReadStream(XML_PATH);
  const xmlStream = new XmlStream(stream);

  jsonStream.write('[')

  xmlStream.on(`endElement: ${END_ELEMENT}`, (element) => {
    const elementSchema = new Set(Object.keys(element));
    // ensure the right JSON schema
    if(isValidSchema(elementSchema)) {
      jsonStream.write(`${JSON.stringify(element)},`);
    }
  });

  xmlStream.on('end', db.save);
}

// runner
try {
  Main();
} catch(error) {
  console.error(error);
}
