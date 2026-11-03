// Decimal money and catalog-only price projections adapted from the read-only
// tuzi-switch reference. No billing expression is executed.
window.tuziMoney = (() => {
function decimal(value) {
    if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("invalid decimal");
    const [a, b = ""] = value.split(".");
    return [
        BigInt(a + b),
        10n ** BigInt(b.length)
    ];
}
function formatMoney(quota, money, places = 2) {
    if (money.display_type === "TOKENS") return quota + " quota";
    const [q, qd] = decimal(quota), [unit, ud] = decimal(money.quota_per_unit), [rate, rd] = decimal(money.display_type === "CNY" ? money.usd_exchange_rate : money.display_type === "CUSTOM" ? money.custom_currency_exchange_rate : "1");
    if (unit <= 0n || rate <= 0n) throw new Error("invalid money metadata");
    const n = q * ud * rate, d = qd * unit * rd, scale = 10n ** BigInt(places), negative = n < 0n, abs = negative ? -n : n;
    const rounded = (abs * scale * 2n + d) / (2n * d);
    const symbol = money.display_type === "USD" ? "USD " : money.display_type === "CNY" ? "CNY " : money.custom_currency_symbol + " ";
    if (abs > 0n && rounded === 0n) return symbol + (negative ? "-" : "") + "<" + (1 / 10 ** places).toFixed(places);
    return symbol + (negative ? "-" : "") + (rounded / scale).toString() + "." + (rounded % scale).toString().padStart(places, "0");
}
function amountToQuota(amount, money, currency) {
    if (!/^\d+(\.\d{1,8})?$/.test(amount)) throw new Error("invalid amount");
    const [a, ad] = decimal(amount);
    const [unit, ud] = decimal(money.quota_per_unit);
    const [rate, rd] = decimal(currency === "CNY" ? money.usd_exchange_rate : "1");
    if (unit <= 0n || rate <= 0n) throw new Error("invalid money metadata");
    const n = a * unit * rd, d = ad * ud * rate;
    return ((2n * n + d) / (2n * d)).toString();
}

const number = (v)=>typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
function catalogPrices(model) {
    if (model.pricing_unavailable || model.billing_mode === "tiered_expr" || model.billing_expr) return [];
    const rows = [];
    const add = (label, amount, unit = "/ 1M tokens")=>{
        const value = number(amount);
        if (value !== null) rows.push({
            label,
            amount: value,
            unit
        });
    };
    if (model.quota_type === 0) {
        add("Per request", model.model_price, "/ request");
        return rows;
    }
    if (model.quota_type === 2) {
        add("Per second", model.model_second_price ?? model.second_price ?? model.model_price, "/ second");
        return rows;
    }
    const ratio = number(model.model_ratio);
    const input = ratio === null ? null : ratio * 2;
    add("Inference input", input);
    for (const [label, price, field] of [
        [
            "Inference output",
            "completion_price",
            "completion_ratio"
        ],
        [
            "Cache hit",
            "cache_price",
            "cache_ratio"
        ],
        [
            "Cache creation",
            "create_cache_price",
            "create_cache_ratio"
        ],
        [
            "Cache creation · 5 minutes",
            "create_cache_price_5m",
            "create_cache_ratio_5m"
        ],
        [
            "Cache creation · 1 hour",
            "create_cache_price_1h",
            "create_cache_ratio_1h"
        ]
    ]){
        const multiplier = number(model[field]);
        add(label, number(model[price]) ?? (input !== null && multiplier !== null ? input * multiplier : null));
    }
    return rows;
}

function priceTiers(expression) {
    if (expression.length > 16000) return [];
    const units = {
        p: "Inference input",
        c: "Inference output",
        cr: "Cache hit",
        cc: "Cache creation",
        cc5m: "Cache creation · 5 minutes",
        cc1h: "Cache creation · 1 hour"
    };
    const result = [];
    const starts = [
        ...expression.matchAll(/\btier\(\s*"([^"\\]*)"\s*,/g)
    ];
    const ranges = [];
    try {
        for (const match of starts){
            let end = match.index + match[0].length, depth = 1;
            const begin = end;
            for(; end < expression.length; end++){
                if (expression[end] === "(") depth++;
                if (expression[end] === ")" && --depth === 0) break;
            }
            if (depth !== 0) return [];
            ranges.push([
                match.index,
                end + 1
            ]);
            const source = expression.slice(begin, end);
            const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-zA-Z_]\w*|[()+*/-]/gi) ?? [];
            if (tokens.join("") !== source.replace(/\s/g, "") || tokens.length > 300) return [];
            let pos = 0;
            const scalar = (n)=>({
                    constant: n,
                    terms: {}
                });
            const scale = (a, n)=>({
                    constant: a.constant * n,
                    terms: Object.fromEntries(Object.entries(a.terms).map(([k, v])=>[
                            k,
                            v * n
                        ]))
                });
            function atom() {
                const token = tokens[pos++];
                if (token === "(") {
                    const a = sum();
                    if (tokens[pos++] !== ")") throw Error();
                    return a;
                }
                if (token === "-") return scale(atom(), -1);
                if (token in units) return {
                    constant: 0,
                    terms: {
                        [token]: 1
                    }
                };
                const n = Number(token);
                if (!Number.isFinite(n)) throw Error();
                return scalar(n);
            }
            function product() {
                let a = atom();
                while([
                    "*",
                    "/"
                ].includes(tokens[pos])){
                    const op = tokens[pos++], b = atom();
                    if (Object.keys(b.terms).length === 0) a = scale(a, op === "*" ? b.constant : 1 / b.constant);
                    else if (op === "*" && Object.keys(a.terms).length === 0) a = scale(b, a.constant);
                    else throw Error();
                }
                return a;
            }
            function sum() {
                let a = product();
                while([
                    "+",
                    "-"
                ].includes(tokens[pos])){
                    const sign = tokens[pos++] === "+" ? 1 : -1, b = scale(product(), sign);
                    a = {
                        constant: a.constant + b.constant,
                        terms: {
                            ...a.terms
                        }
                    };
                    for (const [k, v] of Object.entries(b.terms))a.terms[k] = (a.terms[k] ?? 0) + v;
                }
                return a;
            }
            const value = sum();
            if (pos !== tokens.length) return [];
            const v2 = expression.trim().startsWith("v2:");
            const prices = Object.entries(value.terms).map(([k, v])=>({
                    label: units[k],
                    amount: v * (v2 ? 1e6 : 1),
                    unit: "/ 1M tokens"
                }));
            if (value.constant !== 0 || !prices.length) prices.push({
                label: "Fixed charge",
                amount: value.constant / (v2 ? 1 : 1e6),
                unit: "/ request"
            });
            if (prices.some((p)=>!Number.isFinite(p.amount) || p.amount < 0)) return [];
            result.push({
                label: match[1],
                prices
            });
        }
        if (/\b(?:priceScale|min|max|ceil|floor)\s*\(/.test(expression)) return [];
        let skeleton = expression;
        for (const [start, end] of ranges.reverse())skeleton = skeleton.slice(0, start) + "@" + skeleton.slice(end);
        skeleton = skeleton.trim().replace(/^v[12]:/, "").trim();
        if (!/^(?:[a-zA-Z_]\w*\s*(?:<=|>=|==|<|>)\s*\d+(?:\.\d+)?\s*\?\s*@\s*:\s*)*@$/.test(skeleton)) return [];
        return result;
    } catch  {
        return [];
    }
}

const object = (v)=>v && typeof v === "object" && !Array.isArray(v) ? v : {};
const numeric = (v)=>typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
function groupPrices(model, meta) {
    const usable = object(meta.usable_group), info = object(meta.all_level_group_info);
    const visible = Object.keys(usable);
    const enabled = model.enable_groups;
    const groups = (visible.length ? visible.filter((g)=>enabled.includes("all") || enabled.includes(g)) : enabled).filter((g)=>g !== "all" && g !== "auto");
    const plans = object(meta.group_model_pricing);
    const baseRatios = object(meta.base_group_ratio);
    const ratios = Object.keys(baseRatios).length ? baseRatios : object(meta.group_ratio);
    return [
        ...new Set(groups)
    ].map((group)=>{
        const name = model.model_name;
        const resolution = object(object(meta.default_resolution)[name]);
        const alias = resolution.effective_group ?? object(object(plans.default).effective_group)[name];
        const effective = group === "default" && typeof alias === "string" ? alias : group;
        const plan = object(plans[effective] ?? plans[group]);
        const get = (field)=>object(plan[field])[name];
        let record = {
            ...model
        };
        let multiplier = numeric(ratios[effective] ?? ratios[group]);
        const type = get("quota_type");
        const expression = get("billing_expr");
        const perCall = get("model_price"), perSecond = get("model_second_price"), ratio = get("model_ratio");
        const complete = typeof expression === "string" && expression.length > 0 || type === 0 && numeric(perCall) !== null || type === 1 && numeric(ratio) !== null || type === 2 && numeric(perSecond) !== null || type === undefined && [
            perCall,
            perSecond,
            ratio
        ].some((v)=>numeric(v) !== null);
        if (get("pricing_source") === "group_multiplier" || get("model_multiplier") !== undefined) {
            multiplier = numeric(get("model_multiplier"));
        } else if (complete) {
            record.pricing_unavailable = false;
            record.billing_expr = null;
            record.billing_mode = null;
            if (typeof expression === "string" && expression.length > 0) {
                record.billing_expr = expression;
                record.billing_mode = "tiered_expr";
            } else {
                record.quota_type = typeof type === "number" ? type : perCall !== undefined ? 0 : perSecond !== undefined ? 2 : 1;
                if (record.quota_type === 0) record.model_price = numeric(perCall);
                if (record.quota_type === 2) {
                    record.model_second_price = perSecond;
                    record.model_price = numeric(perSecond);
                }
                if (record.quota_type === 1) record.model_ratio = numeric(ratio);
                for (const field of [
                    "completion_ratio",
                    "cache_ratio",
                    "create_cache_ratio",
                    "create_cache_ratio_5m",
                    "create_cache_ratio_1h",
                    "image_ratio",
                    "image_cache_ratio",
                    "image_output_ratio",
                    "audio_ratio",
                    "audio_cache_ratio",
                    "audio_completion_ratio"
                ]){
                    if (get(`model_${field}`) !== undefined) record[field] = get(`model_${field}`);
                }
            }
            const source = get("pricing_source") ?? "group_override";
            if (get("pricing_semantics") === "final_v1" && source !== "global_fallback" || record.billing_expr && source === "group_override") multiplier = 1;
        }
        if (multiplier === null && Object.keys(ratios).length === 0 && get("model_multiplier") === undefined && get("pricing_source") !== "group_multiplier") multiplier = 1;
        const tiers = record.pricing_unavailable || multiplier === null ? [] : record.billing_expr ? priceTiers(record.billing_expr) : [
            {
                label: "Model catalog price",
                prices: catalogPrices(record)
            }
        ];
        return {
            group,
            label: String(object(info[group]).DisplayName || usable[group] || group),
            tiers: tiers.map((tier)=>({
                    ...tier,
                    prices: tier.prices.map((p)=>({
                            ...p,
                            amount: p.amount * multiplier
                        })).filter((p)=>Number.isFinite(p.amount))
                }))
        };
    });
}

return {formatMoney, amountToQuota, groupPrices, priceTiers, catalogPrices};
})();
