function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

const OUTSIDE_RUN = Symbol("outside_run");
let currentRun = OUTSIDE_RUN;
const hookStateMap = new (WeakMap ? WeakMap : Map)();

const reset = () => {
  currentRun = OUTSIDE_RUN;
};

const createHookApi = name => {
  const hookStates = hookStateMap.get(currentRun.context);

  if (hookStates[currentRun.hookStateIndex] === undefined) {
    hookStates[currentRun.hookStateIndex] = {};
  }

  const hookState = hookStates[currentRun.hookStateIndex];
  const onStateChange = currentRun.onStateChange;
  return {
    onCleanUp(callback) {
      hookState.cleanUp = callback;
    },

    beforeNextRun(callback) {
      hookState.beforeNextRun = callback;
    },

    afterCurrentRun(callback) {
      hookState.afterCurrentRun = callback;
    },

    getContext() {
      return currentRun.context;
    },

    getState(initialState) {
      if (hookState.state === undefined) hookState.state = initialState;
      return hookState.state;
    },

    setState(value) {
      let silent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      let oldValue = hookState.state;
      hookState.state = value;
      if (!silent && onStateChange) onStateChange(name, oldValue, value);
    }

  };
};

const createHook = (name, hook) => {
  return function () {
    if (currentRun.context === OUTSIDE_RUN) throw new Error("Hook was called outside of run()!");
    currentRun.hookStateIndex++;
    const hookApi = createHookApi(name);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return hook(...args, hookApi);
  };
};

function runLifeCycleCallback(name, hookStates, length) {
  let index = length;

  while (index--) {
    const hookState = hookStates[length - index - 1];

    if (hookState[name]) {
      hookState[name]();
      hookState[name] = undefined;
    }
  }
}

const cleanUp = context => {
  const hookStates = hookStateMap.get(context);
  runLifeCycleCallback("cleanUp", hookStates, hookStates.length);
};
const dispose = context => {
  const hookStates = hookStateMap.get(context);
  runLifeCycleCallback("cleanUp", hookStates, hookStates.length);
  hookStateMap.delete(context);
};
const run = function run(runData) {
  if (typeof runData === "function") {
    runData = {
      context: runData,
      function: runData
    };
  }

  if (!(runData.context instanceof Object)) throw new Error("Run was called without a valid object context!");
  currentRun = runData;
  currentRun.hookStateIndex = -1;
  let init = false;

  if (!hookStateMap.has(currentRun.context)) {
    hookStateMap.set(currentRun.context, []);
    init = true;
  }

  const hookStates = hookStateMap.get(currentRun.context);
  const length = hookStates.length;
  runLifeCycleCallback("beforeNextRun", hookStates, length);

  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  const result = runData.function(...args);

  if (result instanceof Promise) {
    return result.then(value => {
      runLifeCycleCallback("afterCurrentRun", hookStates, init ? hookStates.length : length);
      reset();
      return value;
    });
  } else {
    runLifeCycleCallback("afterCurrentRun", hookStates, init ? hookStates.length : length);
    reset();
    return result;
  }
};
const useReducer = createHook("useReducer", (reducer, initialState, _ref) => {
  let getState = _ref.getState,
      setState = _ref.setState;
  const state = getState(initialState);
  return [state, action => {
    setState(reducer(state, action));
  }];
});
const useState = createHook("useState", initialState => {
  const _useReducer = useReducer((_, action) => {
    return action.value;
  }, initialState),
        _useReducer2 = _slicedToArray(_useReducer, 2),
        state = _useReducer2[0],
        dispatch = _useReducer2[1];

  return [state, newState => dispatch({
    type: "set_state",
    value: newState
  })];
});
const useEffect = createHook("useEffect", function (effect) {
  var _ref2;

  let valuesIn;

  if ((arguments.length <= 1 ? 0 : arguments.length - 1) > 1) {
    valuesIn = arguments.length <= 1 ? undefined : arguments[1];
  }

  const _ref3 = (_ref2 = (arguments.length <= 1 ? 0 : arguments.length - 1) - 1 + 1, _ref2 < 1 || arguments.length <= _ref2 ? undefined : arguments[_ref2]),
        getState = _ref3.getState,
        setState = _ref3.setState,
        onCleanUp = _ref3.onCleanUp,
        afterCurrentRun = _ref3.afterCurrentRun;

  let _getState = getState({}),
      values = _getState.values,
      cleanUp = _getState.cleanUp;

  let nothingChanged = false;

  if (values !== valuesIn && values && values.length > 0) {
    nothingChanged = true;
    let index = values.length;

    while (index--) {
      if (valuesIn[index] !== values[index]) {
        nothingChanged = false;
        break;
      }
    }

    values = valuesIn;
  }

  if (!nothingChanged) {
    if (cleanUp) cleanUp();
    afterCurrentRun(() => {
      cleanUp = effect();
      setState({
        values: valuesIn,
        cleanUp
      });

      if (cleanUp) {
        onCleanUp(() => {
          cleanUp();
        });
      } else {
        onCleanUp(undefined);
      }
    });
  }
});

export { createHook, cleanUp, dispose, run, useReducer, useState, useEffect };