
const request = require("supertest");
const testSetup = require("./testSetup");

const { expect } = require("chai");

let app;

describe("API /contracts", function () {
  before(async function () {
    const context = await testSetup("contracts");
    app = context.app;
  });

  it("should reply 401 on unauthorized caller", async function () {
    const res = await request(app).get("/contracts/1");
    expect(res.status).to.equal(401);
  });

  it("should return existing contract", async function () {
    const res = await request(app)
                        .get("/contracts/1")
                        .set("profile_id", "1");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.include({
      id: 1,
      terms: "bla bla bla",
      status: "terminated",
      ClientId: 1,
      ContractorId: 5
    });
  });

  it("should return the contract only if it belongs to the profile calling", async function () {
    const contract3 = {
      id:3,
      terms: 'bla bla bla',
      status: 'in_progress',
      ClientId: 2,
      ContractorId: 6
    };
    const clientRes = await request(app)
                              .get("/contracts/3")
                              .set("profile_id", "2");
    expect(clientRes.status).to.equal(200);
    expect(clientRes.body).to.deep.include(contract3);

    const contractorRes = await request(app)
                                  .get("/contracts/3")
                                  .set("profile_id", "6");
    expect(contractorRes.status).to.equal(200);
    expect(contractorRes.body).to.deep.include(contract3);

    const otherRes = await request(app)
                            .get("/contracts/3")
                            .set("profile_id", "8");
    expect(otherRes.status).to.equal(404);
  });

  it("should only contain non terminated contracts", async function () {
    const { body: client1Contracts } = await request(app)
                                              .get("/contracts")
                                              .set("profile_id", "1");
    expect(client1Contracts).to.have.lengthOf(1);
    expect(client1Contracts[0].status).to.equal("in_progress");

    const { body: contractor5Contracts } = await request(app)
                                                  .get("/contracts")
                                                  .set("profile_id", "5");
    expect(contractor5Contracts).to.have.lengthOf(0);

    const { body: contractor6Contracts } = await request(app)
                                                  .get("/contracts")
                                                  .set("profile_id", "6");
    expect(contractor6Contracts).to.have.lengthOf(3);
  });

});
