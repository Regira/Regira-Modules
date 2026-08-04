import { expect, test } from "vitest";
import { getRandom } from "../../src/utilities/number-utility";
import { orderBy, orderByDesc, naturalSort, shuffle } from "../../src/utilities/array-utility";

const numbers = [3, 11, 1, 2, 10, 5, 2, 12, 6, 5, 10, 4];
const strings = ["3a", "20", "5", "11", "11b", "10", "11a"];
const randomObjects = [...Array(getRandom(100, 1000))].fill(0).map((x, i) => ({
  id: i + 1,
  title: `title #${i + 1}`,
  price: getRandom(0, 1000) / 100,
}));
const categories = [
  { id: 1, title: "cat #1" },
  { id: 2, title: "cat #2" },
  { id: 3, title: "cat #3" },
  { id: 4, title: "cat #4" },
];
const products = [
  { id: 1, title: "item #1", price: 0.75, cat: 2 },
  { id: 2, title: "item #2", price: 0.5, cat: 1 },
  { id: 3, title: "item #3", price: 2.0, cat: 1 },
  { id: 4, title: "item #4", price: 1.5, cat: 3 },
  { id: 5, title: "item #5", price: 2.0, cat: 1 },
  { id: 6, title: "item #6", price: 0.25, cat: 3 },
  { id: 7, title: "item #7", price: 1.0, cat: 2 },
  { id: 8, title: "item #8", price: 0.75 },
  { id: 9, title: "item #9", price: 0.25 },
  { id: 10, title: "item #10", price: 2, cat: 1 },
];

// SORTING
// orderBy
test("order numbers asc", () => {
  const orderedNumbers = orderBy(numbers);
  expect(orderedNumbers).not.toEqual(numbers);
  for (let i = 1; i < orderedNumbers.length; i++) {
    expect(orderedNumbers[i].price >= orderedNumbers[i - 1].price);
  }
});
test("order products by price asc", () => {
  const orderedProducts = orderBy(products, (x) => x.price);
  for (let i = 1; i < orderedProducts.length; i++) {
    expect(orderedProducts[i].price >= orderedProducts[i - 1].price);
  }
});
// orderByDesc
test("order products by price desc", () => {
  const orderedProducts = orderByDesc(products, (x) => x.price);
  for (let i = 1; i < orderedProducts.length; i++) {
    expect(orderedProducts[i].price <= orderedProducts[i - 1].price);
  }
});
// naturalSort
test("sort on natural value of strings", () => {
  const orderedStrings = naturalSort(strings);
  expect(orderedStrings).toEqual(["3a", "5", "10", "11", "11a", "11b", "20"]);
});
// shuffle
test("expect a shuffled collection to have the same length but different order than the original", () => {
  const shuffledNumbers = shuffle(numbers);
  // test length
  expect(shuffledNumbers.length).toBe(numbers.length);
  // test the order
  expect(shuffledNumbers).not.toEqual(numbers);
  // every number item should exist in shuffledNumbers
  expect(shuffledNumbers).toContain(...numbers);
});

// FILTERING
import { first, last, distinct, distinctBy, take, skip, page, countPages, except, query } from "../../src/utilities/array-utility";
// first
test("first number", () => {
  expect(first(numbers)).toEqual(3);
});
test("first product from cat 3", () => {
  expect(first(products, (p) => p.cat === 3)).toEqual(products[3]);
});
// last
test("last number", () => {
  expect(last(numbers)).toBe(4);
});
test("last product from cat 3", () => {
  expect(last(products, (p) => p.cat === 3)).toEqual(products[5]);
});
// distinct
test("unique numbers", () => {
  const uniqueNumbers = distinct(numbers);
  expect(uniqueNumbers).toEqual([3, 11, 1, 2, 10, 5, 12, 6, 4]);
});
// distinctBy
test("first product for every category", () => {
  const firstProducts = distinctBy(products, (p) => p.cat);
  expect(firstProducts.length).toBe(4);
  expect(firstProducts).toEqual([
    { id: 1, title: "item #1", price: 0.75, cat: 2 },
    { id: 2, title: "item #2", price: 0.5, cat: 1 },
    { id: 4, title: "item #4", price: 1.5, cat: 3 },
    { id: 8, title: "item #8", price: 0.75 },
  ]);
});
// take
test("take 3 categories", () => {
  const limitedCategories = take(categories, 3);
  expect(limitedCategories.length).toBe(3);
  expect(limitedCategories).toContain(categories[0]);
  expect(limitedCategories).toContain(categories[1]);
  expect(limitedCategories).toContain(categories[2]);
  expect(limitedCategories).not.toContain(categories[3]);
});
test("take max categories", () => {
  expect(take(categories, Number.MAX_SAFE_INTEGER).length).toBe(categories.length);
});
// skip
test("skip 2 categories", () => {
  const limitedCategories = skip(categories, 2);
  expect(limitedCategories.length).toBe(2);
  expect(limitedCategories).not.toContain(categories[0]);
  expect(limitedCategories).not.toContain(categories[1]);
  expect(limitedCategories).toContain(categories[2]);
  expect(limitedCategories).toContain(categories[3]);
});
// page
test("get 2 products from page 3", () => {
  const pagedProducts = page(products, 2, 2);
  expect(pagedProducts.length).toBe(2);
  expect(pagedProducts).not.toContain(products[0]);
  expect(pagedProducts).not.toContain(products[1]);
  expect(pagedProducts).not.toContain(products[2]);
  expect(pagedProducts).not.toContain(products[3]);
  expect(pagedProducts).toContain(products[4]);
  expect(pagedProducts).toContain(products[5]);
  expect(pagedProducts).not.toContain(products[6]);
});
test("get 3 products from page 4 (pageIndex 3) but expect only the last 1", () => {
  const pagedProducts = page(products, 3, 3);
  expect(pagedProducts.length).toBe(1);
  expect(pagedProducts).not.toContain(products[8]);
  expect(pagedProducts).toContain(products[9]);
});
// countPages
test("count number of pages for products with pageSize of 3", () => {
  expect(countPages(products, 3)).toBe(4);
});
// except
test("return all products except cat 2", () => {
  const filteredProducts = except(
    products,
    products.filter((p) => p.cat === 2)
  );
  expect(filteredProducts.length).toBe(8);
  expect(filteredProducts).not.toContain(products.find((p) => p.cat === 2));
  expect(filteredProducts).toContain(products.find((p) => p.cat !== 2));
});
test("return all products when excluding an empty array", () => {
  const filteredProducts = except(products, []);
  expect(filteredProducts).toEqual(products);
});
test("return an empty array when excluding all products", () => {
  const filteredProducts = except(products, products);
  expect(filteredProducts).toEqual([]);
});
// query
test("filter products by min price 1", () => {
  const filteredProducts = query(products, { minPrice: 1 });
  expect(filteredProducts).toEqual([
    { id: 3, title: "item #3", price: 2.0, cat: 1 },
    { id: 4, title: "item #4", price: 1.5, cat: 3 },
    { id: 5, title: "item #5", price: 2.0, cat: 1 },
    { id: 7, title: "item #7", price: 1.0, cat: 2 },
    { id: 10, title: "item #10", price: 2, cat: 1 },
  ]);
});

// MERGING
import { innerJoin, groupJoin, groupBy } from "../../src/utilities/array-utility";
// innerJoin
test("innerJoin: get corresponding items from numbers and strings", () => {
  const joinedNumbers = innerJoin(
    numbers,
    strings,
    (n) => n,
    (s) => +s,
    (n, s) => n
  );
  expect(joinedNumbers.length).toBe(5);
  expect(joinedNumbers).toContain(...[5, 10, 11]);
  expect(joinedNumbers).not.toContain(...[1, 2, 3, 6]);
});

// GROUPING
// groupJoin
test("get all products for each category", () => {
  const categoriesWithProducts = groupJoin(
    categories,
    products,
    (c) => c.id,
    (o) => o.cat
  );
  expect(categoriesWithProducts.length).toBe(categories.length);
  categoriesWithProducts.forEach(([parent, children]) => {
    expect(children).toEqual(products.filter((x) => x.cat === parent.id));
  });
});
// groupBy
test("group products by cat", () => {
  const groupedProducts = groupBy(products, (x) => x.cat);
  expect(groupedProducts.length).toBe(4);
  groupedProducts.forEach(([key, values]) => {
    expect(values).toEqual(products.filter((x) => x.cat === key));
  });
});

// AGGREGATES
import { count, min, max, sum, average } from "../../src/utilities/array-utility";
// count
test("count products without predicate", () => {
  expect(count(products)).toBe(products.length);
});
test("count products with cat 2", () => {
  expect(count(products, (p) => p.cat === 2)).toBe(2);
});
// min
test("lowest number", () => {
  expect(min(numbers)).toBe(1);
});
test("lowest product price", () => {
  expect(min(products, (p) => p.price)).toBe(0.25);
});
// max
test("highest number", () => {
  expect(max(numbers)).toBe(12);
});
test("highest product price", () => {
  expect(max(products, (p) => p.price)).toBe(2.0);
});
// sum
test("sum numbers", () => {
  expect(sum(numbers)).toBe(71);
});
test("sum product prices for cat 2", () => {
  expect(
    sum(
      products.filter((p) => p.cat === 2),
      (p) => p.price
    )
  ).toBeCloseTo(1.75, 5);
});
// average
test("average number", () => {
  expect(average(numbers)).toBeCloseTo(5.91667, 5);
});
test("average product price", () => {
  expect(average(products, (p) => p.price)).toBeCloseTo(1.1, 5);
});

import { toMap, sameContent } from "../../src/utilities/array-utility";
// toMap
test("map categories to a single object with id as key", () => {
  var categoryObject = toMap(categories, (c) => c.id);
  expect([...categoryObject.keys()]).toEqual([1, 2, 3, 4]);
  expect(categoryObject.get(1)).toBe(categories.find((x) => x.id === 1));
});
// sameContent
test("an array has the same content, but not the same order as a shuffled array", () => {
  const shuffledProducts = shuffle(products);
  expect(sameContent(shuffledProducts, products, false)).toBeTruthy();
  expect(sameContent(shuffledProducts, products, true)).toBeFalsy();
});
test("an array has not the same content when removing or adding an item", () => {
  const alteredObjects = [...randomObjects];
  alteredObjects.pop();
  alteredObjects.splice(3, 1, { id: -1, title: "new item", price: 0 });
  expect(sameContent(alteredObjects, randomObjects, false)).toBeFalsy();
});

import { move, reFill } from "../../src/utilities/array-utility";
test("move a category down and check the new index", () => {
  const categoriesClone = [...categories];
  const cat2 = categoriesClone[1];
  move(categoriesClone, cat2, 3);
  expect(categoriesClone).toContain(...categories);
  expect(categoriesClone[1]).not.toBe(cat2);
  expect(categoriesClone[3]).toBe(cat2);
});
test("reFill an array with new content", () => {
  const arr1 = [1, 2, 3, 4];
  const arr2 = [6, 5, 4];
  reFill(arr1, arr2);
  expect(arr1).toContain(...arr2);
  expect(arr1).not.toBe(arr2);
  expect(arr1.length).toBe(arr2.length);
});
