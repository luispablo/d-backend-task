
const buildApp = require("../src/app");
const dotenv = require("dotenv");

const { unlink } = require("fs/promises");

const testSetup = async function testSetup () {

  dotenv.config({ path: "test/.env" });

  const dbName = `test/${process.env.DB_FILENAME}`;

  try {
    await unlink(dbName);
  } catch {
    // Do nothing, file not exists yet
  }

  require("../scripts/seedDb")(dbName);
  await new Promise(res => setTimeout(res, 50)); // FIXME: Small wait to have DB file ready for tests

  const app = buildApp(dbName);

  return {
    app
  };
};

module.exports = testSetup;