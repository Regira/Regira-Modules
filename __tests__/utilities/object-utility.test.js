import { expect, test, describe } from "vitest";
import { isPlainObject, mixin, crawlObject, deepCopy, flattenObject, filterObject } from "../../src/utilities/object-utility";

const fruit = { title: "Fruit" };
const apple = { id: 1, title: "apple", price: 1, category: fruit };
const orange = { id: 2, title: "orange", price: 1.5, category: fruit };
const customer = { id: "ABC", name: "Anonymous" };
const customerAddress = { street: "A Street", number: "5B" };
const order = { date: new Date(), orderLines: [] };
const orderLines = [
  { id: 1, product: apple, amount: 3 },
  { id: 2, product: orange, amount: 2 },
];

// plain object
describe("plainObject", () => {
  test("fruit is a plain object", () => {
    expect(isPlainObject(fruit)).toBeTruthy();
  });
  test("arrays, functions, dates, regex, numbers, null are not plain objects", () => {
    expect(isPlainObject([])).not.toBeTruthy();
    expect(isPlainObject(() => {})).not.toBeTruthy();
    expect(isPlainObject(function () {})).not.toBeTruthy();
    expect(isPlainObject(new Date())).not.toBeTruthy();
    expect(isPlainObject(/test/)).not.toBeTruthy();
    expect(isPlainObject(5)).not.toBeTruthy();
    expect(isPlainObject(null)).not.toBeTruthy();
  });
});
// mixin
test("mixin will extend an object", () => {
  const source = {};
  expect(mixin(source, { prop: "A" })).toBe(source);
});
test("mix an customer with his address", () => {
  expect(mixin(customer, customerAddress)).toEqual({ ...customer, ...customerAddress });
});
test("add orderlines to an order using mixins", () => {
  expect(mixin(order, { orderLines })).toEqual({ ...order, orderLines });
});
test("mix an order with a customer and orderlines to a new object", () => {
  const result = mixin({}, order, { orderLines }, { customer: mixin(customer, customerAddress) });
  expect(result).not.toBe(order);
  expect(result).toEqual({ ...order, orderLines, customer: { ...customer, ...customerAddress } });
});
// crawlObject
describe("crawlObject", () => {
  test("crawl an object to find a property's value", () => {
    expect(crawlObject({ prop: { value: "test" } }, "prop.value")).toBe("test");
  });
  test("crawl an object with array property to find a value", () => {
    expect(crawlObject({ props: [{ value: "zero" }, { value: "one" }] }, "props.1.value")).toBe("one");
  });
  test("crawl an object to NOT find a nonexisting property's value", () => {
    expect(crawlObject({ prop: { value: "test" } }, "prop.value2")).toBeUndefined();
  });
});
// deepCopy
test("deep copy a filled order will have its properties", () => {
  const myOrder = { ...order };
  myOrder.customer = customer;
  myOrder.orderLines = orderLines;
  const myCopy = deepCopy(myOrder);
  expect(myCopy).toEqual({ ...order, customer, orderLines });
  expect(myCopy.customer).toEqual(customer);
  expect(myCopy.orderLines).toEqual(orderLines);
});
test("deep copy loses its pointers", () => {
  const myOrder = { ...order };
  myOrder.customer = customer;
  myOrder.orderLines = orderLines;
  const myCopy = deepCopy(myOrder);
  expect(myCopy).not.toBe(myOrder);
  expect(myCopy.customer).not.toBe(customer);
  expect(myCopy.orderLines).not.toBe(orderLines);
});
// flatten
test("flatten an object", () => {
  expect(flattenObject({ a: { b: { c: { v: 4 }, v: 3 }, v: 2 }, v: 1 })).toEqual({ "a.b.c.v": 4, "a.b.v": 3, "a.v": 2, v: 1 });
});
// filterObject
const obj = { id: 1, title: "a sample object", price: 2.5 };
test("filterObject: expect true for id 1", () => {
  expect(filterObject(obj, { id: 1 })).toBeTruthy();
});
test("filterObject: expect true for ids 1,2,3", () => {
  expect(filterObject(obj, { id: [1, 2, 3] })).toBeTruthy();
});
test(`filterObject: expect true for title* 'a sample'`, () => {
  expect(filterObject(obj, { "title*": "a sample" })).toBeTruthy();
});
test(`filterObject: expect true for price >= 2.5`, () => {
  expect(filterObject(obj, { minPrice: 2.5 })).toBeTruthy();
});
test(`filterObject: expect false for price <= 3`, () => {
  expect(filterObject(obj, { maxPrice: 2 })).toBeFalsy();
});
