import { expect } from "chai";
import { AccessControlPolicy, PolicyService } from "./PolicyService";
import { v4 as uuidv4 } from "uuid";
import { DCDError } from "@datacentricdesign/types";
import { Log } from "../../Logger";

let createdACP: AccessControlPolicy,
  personId: string,
  policyService: PolicyService,
  thingId: string;

describe("Policy Service", function () {
  before(async function () {
    policyService = PolicyService.getInstance();
    // Test values
    thingId = `dcd:things:${uuidv4()}`;
    personId = "dcd:persons:test@test.com";
  });

  it("Role to Actions - empty role", function () {
    const result = PolicyService.roleToActions("");
    expect(result.length).equal(0);
  });

  it("Grant", function (done: Mocha.Done) {
    this.timeout(10000);
    policyService
      .grant(personId, thingId, "owner")
      .then((acp: AccessControlPolicy) => {
        createdACP = acp;
        expect(acp.subjects[0]).to.equal(personId);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Get Role Id", function (done: Mocha.Done) {
    this.timeout(10000);
    policyService
      .getRoleId(personId, thingId, "owner")
      .then((roleId: string) => {
        Log.info(roleId);
        expect(roleId).to.equal(createdACP.id);
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });

  it("Revoke", function (done: Mocha.Done) {
    this.timeout(10000);
    policyService
      .revoke(personId, thingId, "owner")
      .then((acp: AccessControlPolicy) => {
        expect(acp.subjects[0]).to.equal(personId);
        expect(acp.effect).to.equal("deny");
        done();
      })
      .catch((error: DCDError) => {
        Log.error(error);
        done(error);
      });
  });
});
