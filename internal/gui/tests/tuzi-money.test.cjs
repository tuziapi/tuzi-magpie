const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/plugins/tuzi/money.js'),'utf8'),context);const {formatMoney,amountToQuota,groupPrices,priceTiers}=context.window.tuziMoney;
const money={quota_per_unit:'500000',display_type:'CNY',usd_exchange_rate:'7',custom_currency_exchange_rate:'1'};
test('account money preserves decimal precision, half-up, tiny nonzero and missing rates',()=>{assert.equal(formatMoney('500000',money),'CNY 7.00');assert.equal(formatMoney('1',money),'CNY <0.01');assert.equal(amountToQuota('0.07',money,'CNY'),'5000');assert.equal(formatMoney('9007199254740993',{...money,display_type:'USD',quota_per_unit:'1'}),'USD 9007199254740993.00');assert.throws(()=>formatMoney('1',{...money,quota_per_unit:'0'}));});
test('catalog group price does not reapply multiplier to final group price or mix personal overrides',()=>{const m={model_name:'fixture',enable_groups:['default'],quota_type:1,model_ratio:1,completion_ratio:2};const p=groupPrices(m,{usable_group:{default:'Default'},base_group_ratio:{default:2},group_model_pricing:{default:{quota_type:{fixture:1},model_ratio:{fixture:3},pricing_source:{fixture:'group_override'},pricing_semantics:{fixture:'final_v1'}}},user_model_ratio:{fixture:99}});assert.equal(p[0].tiers[0].prices[0].amount,6);assert.equal(groupPrices({...m,pricing_unavailable:true},{})[0].tiers.length,0);});
test('safe tier projection handles linear prices and rejects wrappers/unsupported expressions',()=>{const p=priceTiers('v2: p > 100 ? tier("large", p * 0.000002 + c * 0.000004) : tier("small", p * 0.000001)');assert.equal(p.length,2);assert.equal(p[0].prices[0].amount,2);assert.equal(priceTiers('v2: priceScale(tier("x",p),2)').length,0);assert.equal(priceTiers('v2: tier("x",p*c)').length,0);});

// Public model.Pricing task shapes from tuzi-api/model/pricing.go. These
// conditional, resolution and per-call variants have no complete desktop UI.
const complexTaskPrices = {
  conditional_task_pricing: { no_video_price: 0.12, no_video_price_currency: 'USD', video_price: 0.24, video_price_currency: 'USD' },
  conditional_task_pricing_details: { price_variants: [{ has_video_input: false, has_audio_input: true, unit_price: 0.3, unit_price_currency: 'USD', estimate_mode: 'duration' }] },
  task_per_second_pricing: { unit: 'second', default_duration_sec: 5, max_duration_sec: 15, variants: [{ resolution: '768P', unit_price: 0.5, unit_price_currency: 'CNY' }, { resolution: '2K', unit_price: 0.8, unit_price_currency: 'CNY' }] },
  per_call_variants: [{ label: 'standard', price: 0.1, currency: 'USD' }, { label: 'high', price: 0.2, extra_ratio: 2, currency: 'USD' }],
};
const taskModel = { model_name: 'task-fixture', enable_groups: ['default'], quota_type: 0, model_price: 0.1 };
for (const [field, value] of Object.entries(complexTaskPrices)) {
  test(`${field} directs unsupported task prices to the website`, () => {
    const model = { ...taskModel, [field]: value };
    assert.equal(context.window.tuziMoney.catalogPrices(model).length, 0, 'a base price must not stand for all variants');
    assert.equal(groupPrices(model, {})[0].tiers.length, 0, 'the existing website fallback must be used');
    assert.equal(groupPrices({ ...model, billing_expr: 'v2: tier("base", p * 0.000001)' }, {})[0].tiers.length, 0, 'a linear expression cannot describe the task variants');
    const override = { group_model_pricing: { default: { quota_type: { 'task-fixture': 0 }, model_price: { 'task-fixture': 0.2 }, pricing_source: { 'task-fixture': 'group_override' }, pricing_semantics: { 'task-fixture': 'final_v1' } } } };
    assert.equal(groupPrices(model, override)[0].tiers.length, 0, 'a scalar group override does not remove task conditions');
  });
}
test('absent and empty task structures keep ordinary base prices', () => {
  for (const empty of [undefined, null, {}, [], { variants: [], price_variants: [] }]) {
    const model = { ...taskModel, ...Object.fromEntries(Object.keys(complexTaskPrices).map((field) => [field, empty])) };
    assert.equal(context.window.tuziMoney.catalogPrices(model)[0].amount, 0.1);
    assert.equal(groupPrices(model, {})[0].tiers[0].prices[0].amount, 0.1);
  }
  assert.equal(groupPrices({ ...taskModel, model_price: 0 }, {})[0].tiers[0].prices[0].amount, 0, 'an explicit ordinary zero is still a valid catalog price');
  assert.equal(groupPrices({ ...taskModel, conditional_task_pricing: { no_video_price: 0, video_price: 0 } }, {})[0].tiers.length, 0, 'zero-valued conditions are still a nonempty complex structure');
});
