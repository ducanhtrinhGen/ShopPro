import { apiRequest } from "./client";
import type { Brand, Category } from "../types";

let cachedCategories: Category[] | null = null;
let inflightCategoriesRequest: Promise<Category[]> | null = null;

export async function getCategories(options?: { force?: boolean }): Promise<Category[]> {
  if (options?.force) {
    cachedCategories = null;
    inflightCategoriesRequest = null;
  }

  if (cachedCategories) {
    return [...cachedCategories];
  }

  if (inflightCategoriesRequest) {
    return inflightCategoriesRequest;
  }

  inflightCategoriesRequest = apiRequest<Category[]>("/api/categories")
    .then((data) => {
      cachedCategories = [...data];
      return [...data];
    })
    .finally(() => {
      inflightCategoriesRequest = null;
    });

  return inflightCategoriesRequest;
}

export function clearCategoriesCache(): void {
  cachedCategories = null;
  inflightCategoriesRequest = null;
}

let cachedBrands: Brand[] | null = null;
let inflightBrandsRequest: Promise<Brand[]> | null = null;

export async function getBrands(options?: { force?: boolean }): Promise<Brand[]> {
  if (options?.force) {
    cachedBrands = null;
    inflightBrandsRequest = null;
  }

  if (cachedBrands) {
    return [...cachedBrands];
  }

  if (inflightBrandsRequest) {
    return inflightBrandsRequest;
  }

  inflightBrandsRequest = apiRequest<Brand[]>("/api/brands")
    .then((data) => {
      cachedBrands = [...data];
      return [...data];
    })
    .finally(() => {
      inflightBrandsRequest = null;
    });

  return inflightBrandsRequest;
}
