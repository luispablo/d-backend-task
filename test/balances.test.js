
const request = require("supertest");
const testSetup = require("./testSetup");

const { expect } = require("chai");

let app;

describe("API /balances", function () {
  before(async function () {
    const context = await testSetup("balances");
    app = context.app;
  });

  it("should deposit money ok", async function () {
    await request(app)
            .post("/balances/deposit/3")
            .set("profile_id", "3")
            .send({ amount: 10 });
    const { body: client3Profile } = await request(app).get("/profiles").set("profile_id", "3");
    expect(client3Profile).to.deep.include({ balance: 461.3 });
  });
  
  it("shouldn't be allowed to deposit more than 25% of his total jobs to pay", async function () {
    // Client 2: $ 402 unpaid, cannot deposit more than 100.5
    const deposit1Res = await request(app)
                                .post("/balances/deposit/2")
                                .set("profile_id", "2")
                                .send({ amount: 100 });
    expect(deposit1Res.status).to.eq(200);
    const { body: client2Profile1 } = await request(app).get("/profiles").set("profile_id", "2");
    expect(client2Profile1.balance).to.eq(331.11);

    const deposit2Res = await request(app)
                                .post("/balances/deposit/2")
                                .set("profile_id", "2")
                                .send({ amount: 101 });
    expect(deposit2Res.status).to.eq(400);
    const { body: client2Profile2 } = await request(app).get("/profiles").set("profile_id", "2");
    expect(client2Profile2.balance).to.eq(331.11);
  });

});
