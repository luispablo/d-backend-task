
const request = require("supertest");
const testSetup = require("./testSetup");

const { expect } = require("chai");

let app;

describe("API /jobs", function () {
  before(async function () {
    const context = await testSetup("jobs");
    app = context.app;
  });


  // 1. ***GET*** `/jobs/unpaid` -  Get all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only***.
  it("should get all unpaid jobs for a user (client or contractor) for active contracts only", async function () {
    // contractor unpaid jobs (not terminated!)
    const { body: contractor7UnpaidJobs } = await request(app)
                                                    .get("/jobs/unpaid")
                                                    .set("profile_id", "7");
    expect(contractor7UnpaidJobs).to.have.lengthOf(2);
    expect(contractor7UnpaidJobs[0].paid).to.be.null;
    expect(contractor7UnpaidJobs[0].paymentDate).to.be.null;
    
    const { body: client2UnpaidJobs } = await request(app)
                                                    .get("/jobs/unpaid")
                                                    .set("profile_id", "2");
    expect(client2UnpaidJobs).to.have.lengthOf(2);
    expect(client2UnpaidJobs[0].paid).to.be.null;
    expect(client2UnpaidJobs[0].paymentDate).to.be.null;

    const { body: client1UnpaidJobs } = await request(app)
                                               .get("/jobs/unpaid")
                                               .set("profile_id", "1");
    expect(client1UnpaidJobs.map(j => j.ContractId)).to.deep.equal([2]);
  });

  // 1. ***POST*** `/jobs/:job_id/pay` - Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved from the client's balance to the contractor balance.
  it("should pay for a job", async function () {
    const { body: client1ProfileBefore } = await request(app).get("/profiles").set("profile_id", "1");
    expect(client1ProfileBefore.balance).to.equal(1150, "Client 1 balance before paying");

    const { body: [client1UnpaidJob] } = await request(app)
                                                .get("/jobs/unpaid")
                                                .set("profile_id", "1");
    const payment1Res = await request(app)
                                .post(`/jobs/${client1UnpaidJob.id}/pay`)
                                .set("profile_id", "1");
    expect(payment1Res.status).to.eq(200);

    const { body: client1Profile } = await request(app).get("/profiles").set("profile_id", "1");
    const { body: contractor6Profile } = await request(app).get("/profiles").set("profile_id", "6");
    expect(client1Profile.balance).to.equal(949);
    expect(contractor6Profile.balance).to.equal(1415);

    // payment not ok, balance stays the same
    const { body: [client4UnpaidJob] } = await request(app)
                                                .get("/jobs/unpaid")
                                                .set("profile_id", "4");
    const payment2Res = await request(app)
                                .post(`/jobs/${client4UnpaidJob.id}/pay`)
                                .set("profile_id", "4");
    expect(payment2Res.status).to.eq(400);
    const { body: client4Profile } = await request(app).get("/profiles").set("profile_id", "4");
    const { body: contractor7Profile } = await request(app).get("/profiles").set("profile_id", "7");
    expect(client4Profile.balance).to.equal(1.3);
    expect(contractor7Profile.balance).to.equal(22);
  });

});
