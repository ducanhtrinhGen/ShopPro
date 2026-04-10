package com.example.demo.api;

import com.example.demo.api.dto.CatalogDtos.CategoryItem;
import com.example.demo.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryApiController {

    private final CategoryService categoryService;

    public CategoryApiController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryItem> listCategories() {
        return categoryService.getAllCategories().stream()
                .map(category -> new CategoryItem(category.getId(), category.getName()))
                .toList();
    }
}
