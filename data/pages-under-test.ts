export const PAGES_UNDER_TEST = [
  { name: "home", path: "/" },
  { name: "product", path: "/products/t-shirts/4" },
  { name: "blog", path: "/blog" },
  { name: "about", path: "/about" },
  { name: "not-found", path: "/this-page-does-not-exist-12345" },
] as const;

export type PageUnderTest = (typeof PAGES_UNDER_TEST)[number];
