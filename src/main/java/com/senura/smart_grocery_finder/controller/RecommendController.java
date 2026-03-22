package com.senura.smart_grocery_finder.controller;

import com.senura.smart_grocery_finder.dto.RecommendRequest;
import com.senura.smart_grocery_finder.dto.RecommendResponse;
import com.senura.smart_grocery_finder.service.ShopService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/recommend")
public class RecommendController {

    private final ShopService shopService;

    public RecommendController(ShopService shopService) {
        this.shopService = shopService;
    }

    // POST /recommend — get best shop recommendation
    // Basic recommendation
    @PostMapping
    public ResponseEntity<RecommendResponse> recommend(@Valid @RequestBody RecommendRequest request) {
        RecommendResponse response = shopService.recommend(request);
        return ResponseEntity.ok(response);
    }

    // Advanced recommendation
    @PostMapping("/advanced")
    public ResponseEntity<List<RecommendResponse>> recommendAdvanced(
            @Valid @RequestBody RecommendRequest request) {

        List<RecommendResponse> response = shopService.recommendAdvanced(request);
        return ResponseEntity.ok(response);
    }
}