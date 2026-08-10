import { makeScenario, scenarioFromParams } from "../scenario";

describe("makeScenario", () => {
  test("emits the right face count and ground-truth labels", () => {
    const s = makeScenario("t", [3, 2]);
    expect(s.faces).toHaveLength(5);
    expect(s.faces.filter((f) => f.truthPerson === 0)).toHaveLength(3);
    expect(s.faces.filter((f) => f.truthPerson === 1)).toHaveLength(2);
  });

  test("expected honors minPts: small groups are noise, not clusters", () => {
    const s = makeScenario("t", [10, 4, 2, 1]); // default minPts 3
    expect(s.expected.clusters).toBe(2);
    expect(s.expected.noise).toBe(3); // the 2 + the 1
    expect(s.expected.sizesDesc).toEqual([10, 4]);
  });

  test("two probes: accept near person 0, reject far out", () => {
    const s = makeScenario("t", [5]);
    expect(s.probes).toHaveLength(2);
    expect(s.probes[0].expectPerson).toBe(0);
    expect(s.probes[1].expectPerson).toBeNull();
  });

  test("scenarioFromParams threads the panel knobs", () => {
    const s = scenarioFromParams({ name: "g", personSizes: [3], minPts: 5 });
    expect(s.name).toBe("g");
    expect(s.expected.clusters).toBe(0); // 3 < minPts 5
    expect(s.expected.noise).toBe(3);
  });
});
