import test from "node:test";
import assert from "node:assert/strict";
import { MAP_DENSITY_COLORS, MAP_SELECTION_COLOR, mapDensityColor, mapDensityLegend } from "../src/components/map/mapScale.js";

test("an empty map has only a zero range and never gives empty municipalities a density color", () => {
  assert.deepEqual(mapDensityLegend(0), [{ min: 0, max: 0, label: "0 registros", color: MAP_DENSITY_COLORS[0] }]);
  for (const count of [0, -1, undefined, NaN, Infinity]) assert.equal(mapDensityColor(count, 0), MAP_DENSITY_COLORS[0]);
  assert.ok(!MAP_DENSITY_COLORS.includes(MAP_SELECTION_COLOR));
});

test("every numeric legend interval describes the actual fill, including small catalogs and boundary counts", () => {
  for (const maximum of [1, 2, 3, 4, 5, 10, 17, 100]) {
    const ranges = mapDensityLegend(maximum);
    assert.equal(ranges[0].min, 0);
    assert.equal(ranges.at(-1).max, maximum);
    for (const range of ranges) assert.ok(range.min <= range.max);
    for (let count = 0; count <= maximum; count++) {
      const containing = ranges.filter(range => range.min <= count && range.max >= count);
      assert.equal(containing.length, 1, `count ${count} in scale 0–${maximum} must have exactly one range`);
      assert.equal(mapDensityColor(count, maximum), containing[0].color);
    }
  }
  assert.deepEqual(mapDensityLegend(10).map(range => range.label), ["0 registros", "1–2 registros", "3–5 registros", "6–7 registros", "8–10 registros"]);
  assert.equal(mapDensityLegend(1)[1].label, "1 registro");
});
