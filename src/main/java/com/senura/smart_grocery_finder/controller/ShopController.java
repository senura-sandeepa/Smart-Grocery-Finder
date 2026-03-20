package com.senura.smart_grocery_finder.controller;

import com.senura.smart_grocery_finder.dto.ShopRequest;
import com.senura.smart_grocery_finder.dto.ShopResponse;
import com.senura.smart_grocery_finder.entity.Shop;
import com.senura.smart_grocery_finder.service.ShopService;
import com.senura.smart_grocery_finder.exception.ResourceNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/shops")
@Validated
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    // POST /shops — create a new shop
    @PostMapping
    public ResponseEntity<ShopResponse> createShop(@RequestBody @Valid ShopRequest request) {
        Shop shop = shopService.createShop(request);
        ShopResponse response = new ShopResponse(
                shop.getId(),
                shop.getName(),
                shop.getXCoordinate(),
                shop.getYCoordinate()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /shops — list all shops
    @GetMapping
    public ResponseEntity<List<ShopResponse>> getAllShops() {
        List<Shop> shops = shopService.getAllShops();
        List<ShopResponse> responses = shops.stream()
                .map(shop -> new ShopResponse(
                        shop.getId(),
                        shop.getName(),
                        shop.getXCoordinate(),
                        shop.getYCoordinate()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // POST /shops/{shopId}/items/{itemId} — assign item to shop
    @PostMapping("/{shopId}/items/{itemId}")
    public ResponseEntity<Void> assignItem(
            @PathVariable Long shopId,
            @PathVariable Long itemId) {

        try {
            shopService.assignItemToShop(shopId, itemId);
            // 204 No Content because we don’t need to return a body
            return ResponseEntity.noContent().build();
        } catch (RuntimeException ex) {
            throw new ResourceNotFoundException(ex.getMessage());
        }
    }
}