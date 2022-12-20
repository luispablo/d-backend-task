
const request = require("supertest");
const testSetup = require("./testSetup");

const { expect } = require("chai");

let app;

describe("API /admin", function () {
  before(async function () {
    const context = await testSetup("admin");
    app = context.app;
  });


  // 1. ***GET*** `/admin/best-profession?start=<date>&end=<date>` - Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time range.
  it("should return the profession that earned the most money (sum of jobs paid)", async function () {
    const { body: profession1 } = await request(app).get("/admin/best-profession?start=2020-08-01&end=2020-08-31").set("profile_id", "1");
    expect(profession1).to.eq("Programmer");
    const { body: profession2 } = await request(app).get("/admin/best-profession?start=2020-08-10&end=2020-08-14").set("profile_id", "1");
    expect(profession2).to.eq("Musician");
  });

  // 1. ***GET*** `/admin/best-clients?start=<date>&end=<date>&limit=<integer>` - returns the clients the paid the most for jobs in the query time period. limit query parameter should be applied, default limit is 2.
  it("should return the clients the paid the most for jobs", async function () { // in the query time period. limit query parameter should be applied, default limit is 2.")
    const { body: clients1 } = await request(app).get("/admin/best-clients?start=2020-08-01&end=2020-08-31&limit=5").set("profile_id", "1");
    expect(clients1).to.deep.eq([
      { id: 4, fullName: 'Ash Kethcum', paid: 2020 },
      { id: 2, fullName: 'Mr Robot', paid: 442 },
      { id: 1, fullName: 'Harry Potter', paid: 442 },
      { id: 3, fullName: 'John Snow', paid: 200 }
    ]);
    const { body: clients2 } = await request(app).get("/admin/best-clients?start=2020-08-01&end=2020-08-14").set("profile_id", "1"); // default limit
    expect(clients2).to.deep.eq([
      { id: 1, fullName: "Harry Potter", paid: 21 }
    ]);
    const { body: clients3 } = await request(app).get("/admin/best-clients?start=2020-08-01&end=2020-08-31&limit=1").set("profile_id", "1");
    expect(clients3).to.have.lengthOf(1);
  });
// ```
//  [
//     {
//         "id": 1,
//         "fullName": "Reece Moyer",
//         "paid" : 100.3
//     },
//     {
//         "id": 200,
//         "fullName": "Debora Martin",
//         "paid" : 99
//     },
//     {
//         "id": 22,
//         "fullName": "Debora Martin",
//         "paid" : 21
//     }
// ]

});
