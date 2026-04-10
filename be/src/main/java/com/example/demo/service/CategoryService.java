package com.example.demo.service;

import com.example.demo.model.Category;
import com.example.demo.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // Lấy tất cả category
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // Lưu category (thêm hoặc sửa)
    public void saveCategory(Category category) {
        categoryRepository.save(category);
    }

    // Lấy category theo id
    public Category getCategoryById(Integer id) {
        return categoryRepository.findById(id).orElse(null);
    }

    // Xóa category
    public void deleteCategory(Integer id) {
        categoryRepository.deleteById(id);
    }
}