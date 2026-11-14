// One pending decision at a time; callers proceed only after an explicit yes.
export function createConfirmationController(onChange) {
  let resolvePending = null;
  function answer(value) {
    const resolve = resolvePending;
    resolvePending = null;
    onChange(null);
    resolve?.(value === true);
  }
  return {
    request(message, action = "save") {
      if (resolvePending || !["edit", "save", "delete", "logout"].includes(action))
        return Promise.resolve(false);
      return new Promise((resolve) => {
        resolvePending = resolve;
        onChange({ message, action });
      });
    },
    answer,
    cancel() {
      answer(false);
    },
  };
}
