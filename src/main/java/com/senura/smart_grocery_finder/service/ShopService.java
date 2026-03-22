package com.senura.smart_grocery_finder.service;

import com.senura.smart_grocery_finder.dto.*;
import com.senura.smart_grocery_finder.entity.*;
import com.senura.smart_grocery_finder.exception.ResourceNotFoundException;
import com.senura.smart_grocery_finder.repository.*;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Service
@AllArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;
    private final ItemRepository itemRepository;

    // --- Create a new shop ---
    public Shop createShop(ShopRequest request) {
        var shop = new Shop();
        shop.setName(request.getName());
        shop.setXCoordinate(request.getXCoordinate());
        shop.setYCoordinate(request.getYCoordinate());
        return shopRepository.save(shop);
    }

    // --- Get all shops ---
    public List<Shop> getAllShops() {
        return shopRepository.findAll();
    }

    // --- Assign an item to a shop ---
    public void assignItemToShop(Long shopId, Long itemId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found with id: " + shopId));

        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));

        shop.getItems().add(item);
        shopRepository.save(shop);
    }

    // Basic one
    public RecommendResponse recommend(RecommendRequest request) {
        List<Shop> allShops = shopRepository.findAll();

        Shop bestShop = null;
        int bestMatchCount = -1;
        double bestDistance = Double.MAX_VALUE;

        for (Shop shop : allShops) {
            // Count how many requested items this shop has
            int matchCount = countMatchingItems(shop, request.getItems());

            // Calculate straight-line distance from user to shop
            double distance = calculateDistance(
                    request.getUserX(), request.getUserY(),
                    shop.getXCoordinate(), shop.getYCoordinate()
            );

            // Pick this shop if it has more matches,
            // OR same matches but closer distance
            if (matchCount > bestMatchCount ||
                    (matchCount == bestMatchCount && distance < bestDistance)) {
                bestShop = shop;
                bestMatchCount = matchCount;
                bestDistance = distance;
            }
        }

        if (bestShop == null || bestMatchCount == 0) {
            throw new ResourceNotFoundException("No shops have the requested items");
        }

        return new RecommendResponse(
                bestShop.getName(),
                bestMatchCount,
                roundDistance(bestDistance));
    }

    // Advanced algo
    public List<RecommendResponse> recommendAdvanced(RecommendRequest request) {

        List<Shop> allShops = shopRepository.findAll();
        List<String> remainingItems = new ArrayList<>(request.getItems());
        List<RecommendResponse> recommendations = new ArrayList<>();

        while (!remainingItems.isEmpty()) {

            Shop bestShop = null;
            List<String> matchedItemsInBestShop = new ArrayList<>();
            double bestDistance = Double.MAX_VALUE;

            for (Shop shop : allShops) {

                List<String> matchedItems = shop.getItems().stream()
                        .map(Item::getName)
                        .filter(item ->
                                remainingItems.stream()
                                        .anyMatch(r -> r.equalsIgnoreCase(item)))
                        .distinct()
                        .toList();

                if (matchedItems.isEmpty()) {
                    continue;
                }

                double distance = calculateDistance(
                        request.getUserX(),
                        request.getUserY(),
                        shop.getXCoordinate(),
                        shop.getYCoordinate()
                );

                if (matchedItems.size() > matchedItemsInBestShop.size() ||
                        (matchedItems.size() == matchedItemsInBestShop.size() && distance < bestDistance)) {

                    bestShop = shop;
                    matchedItemsInBestShop = matchedItems;
                    bestDistance = distance;
                }
            }

            if (bestShop == null) {
                break;
            }

            recommendations.add(
                    new RecommendResponse(
                            bestShop.getName(),
                            matchedItemsInBestShop.size(),
                            roundDistance(bestDistance)
                    )
            );

            // remove matched items
            matchedItemsInBestShop.forEach(item ->
                    remainingItems.removeIf(r -> r.equalsIgnoreCase(item)));

            allShops.remove(bestShop);
        }

        if (recommendations.isEmpty()) {
            throw new ResourceNotFoundException("No shops available for the requested items");
        }

        return recommendations;
    }


    private int countMatchingItems(Shop shop, List<String> requestedItems) {
        int count = 0;
        for (Item shopItem : shop.getItems()) {
            for (String requestedName : requestedItems) {
                if (shopItem.getName().equalsIgnoreCase(requestedName)) {
                    count++;
                }
            }
        }
        return count;
    }

    // --- Helper: Euclidean distance formula ---
    private double calculateDistance(double x1, double y1, double x2, double y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    private double roundDistance(double distance) {
        return new BigDecimal(distance)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }


}
