import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { DCDError } from "@datacentricdesign/types";
import { AccessControlPolicy, PolicyService } from "./PolicyService";
import Log from "../../Log";

let policyService: PolicyService;
let thingId: string;
let personId: string;
let createdACP: AccessControlPolicy;

describe("Policy Service", () => {
  before(async () => {
    policyService = PolicyService.getInstance();
    // Test values
    thingId = `dcd:things:${uuidv4()}`;
    personId = "dcd:persons:test@test.com";
  });

  it("Role to Actions - empty role", () => {
    const result = PolicyService.roleToActions("");
    expect(result.length).equal(0);
  });

  it("Grant", (done: Mocha.Done) => {
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

  it("Get Role Id", (done: Mocha.Done) => {
    PolicyService.getRoleId(personId, thingId, "owner")
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

  it("Revoke", (done: Mocha.Done) => {
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
