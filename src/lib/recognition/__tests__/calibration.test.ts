import { calibrate } from "../calibration";
import { DIM } from "../types";

// helper: a DIM-length vector that's `base` in dim 0 and 0 elsewhere, so L2
// distance between two such vectors is just |base difference|.
const v = (base: number) => [base, ...new Array(DIM - 1).fill(0)];

describe("calibrate", () => {
  test("counts identities and multi-shot identities", () => {
    const r = calibrate(
      [
        { identity: "a", embedding: v(0) },
        { identity: "a", embedding: v(0.1) },
        { identity: "b", embedding: v(5) },
      ],
      0.6,
    );
    expect(r.nSamples).toBe(3);
    expect(r.nIdentities).toBe(2);
    expect(r.nMultiShot).toBe(1); // only "a" has >1 photo
  });

  test("clean separation when intra is tight and inter is far", () => {
    const r = calibrate(
      [
        { identity: "a", embedding: v(0) },
        { identity: "a", embedding: v(0.2) },
        { identity: "b", embedding: v(5) },
        { identity: "b", embedding: v(5.2) },
      ],
      0.6,
    );
    expect(r.intra.overEps).toBe(0); // 0.2 apart < 0.6
    expect(r.inter.underEps).toBe(0); // ~5 apart > 0.6
    expect(r.clean).toBe(true);
  });

  test("detects smear when distributions overlap eps", () => {
    // same-person pair 0.7 apart (false split); different-person pair 0.5 (false merge)
    const r = calibrate(
      [
        { identity: "a", embedding: v(0) },
        { identity: "a", embedding: v(0.7) },
        { identity: "b", embedding: v(0.5) },
        { identity: "b", embedding: v(1.2) },
      ],
      0.6,
    );
    expect(r.intra.overEps).toBeGreaterThan(0);
    expect(r.inter.underEps).toBeGreaterThan(0);
    expect(r.clean).toBe(false);
  });
});
