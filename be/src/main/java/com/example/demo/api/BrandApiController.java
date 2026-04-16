package com.example.demo.api;

import com.example.demo.api.dto.CatalogDtos.BrandItem;
import com.example.demo.repository.BrandRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
public class BrandApiController {

    private final BrandRepository brandRepository;

    public BrandApiController(BrandRepository brandRepository) {
        this.brandRepository = brandRepository;
    }

    @GetMapping
    public List<BrandItem> listBrands() {
        return brandRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(brand -> new BrandItem(brand.getId(), brand.getName()))
                .toList();
    }
}

