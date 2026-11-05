// Presentation only: never rewrite the provider or a user-selected icon.
function tuziIcon(pr) {
  const preset = pr?.preset || pr?.id;
  const presetIcon = preset === "tuzi" ? "magpie" : preset === "tuzi-coding" ? "openai" : null;
  const accountHost = !pr?.preset && ["api.tu-zi.com", "apius.tu-zi.com"].includes(pr?.host);
  const defaultIcon = !pr?.icon || pr.icon === "generic" || presetIcon && pr.icon === presetIcon;
  return (presetIcon || accountHost) && defaultIcon && !pr?.iconFrom ? "tuzi-rabbit" : pr?.icon;
}

// Tuzi-specific shell additions; existing pages use their original controls.
window.tuziShell = {
  async leave() {
    if (magpie.call("tuzi", "busy")) return false;
    if (magpie.call("tuzi", "dirty")) {
      if (!(await confirmDiscard())) return false;
      magpie.call("tuzi", "discard");
    }
    return true;
  },
  links(pr, side) {
  if (pr?.tuziLinks) {
    for (const [label, url] of [["Tuzi purchase / top up ↗", pr.tuziLinks.purchaseUrl], ["Tuzi query website ↗", pr.tuziLinks.queryUrl]]) {
      const b = el("button", "link", t(label));
      b.onclick = () => api("open", { url });
      side.append(b);
    }
  }
  },
};

