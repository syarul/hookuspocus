const { useEffect, pocus } = require("../dist/hookuspocus");

test("useEffect callbacks run in the right oder", () => {
  let index = 0;
  function test() {
    useEffect(() => {
      expect(index).toBe(1);
      index++;
      return () => {
        expect(index).toBe(2);
      };
    });
  }
  expect(index).toBe(0);
  index++;
  pocus(test);
});

test("useEffect makes pocus async", () => {
  let index = 0;
  function test() {
    useEffect(() => {
      index++;
    });
  }
  pocus(test);
  pocus(test);
  pocus(test);
  pocus(test);
  pocus(test);
  expect(index).toBe(0);
});

test("useEffect should skip effects if values don't change", async () => {
  let index = 0;
  function test() {
    useEffect(() => {
      index++;
      return () => {
        index++;
      };
    }, [1, 2, 3, 4, 5]);
  }
  await Promise.all([pocus(test), pocus(test), pocus(test), pocus(test)]);
  expect(index).toBe(1);
});

test("useEffect should cleanUp last non skipped effect on cleanUp call", async () => {
  let index = 1;
  let cleanUpVal;
  function test() {
    useEffect(() => {
      index++;
      let cVal = index;
      cleanUpVal = cVal;
      return () => {
        expect(cVal).toBe(cleanUpVal);
      };
    }, [index < 3 ? index : 3]);
  }
  pocus(test);
  pocus(test);
  pocus(test);
  pocus(test);
});
