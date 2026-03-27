package com.senura.smart_grocery_finder.service;

import com.senura.smart_grocery_finder.dto.RecommendRequest;
import com.senura.smart_grocery_finder.dto.RecommendResponse;
import com.senura.smart_grocery_finder.entity.Item;
import com.senura.smart_grocery_finder.entity.Shop;
import com.senura.smart_grocery_finder.exception.ResourceNotFoundException;
import com.senura.smart_grocery_finder.repository.ItemRepository;
import com.senura.smart_grocery_finder.repository.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShopServiceTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ItemRepository itemRepository;

    @InjectMocks
    private ShopService shopService;

    // ── Test data ──
    private Item milk, bread, eggs, sugar, iceCream;
    private Shop shopA, shopB, shopC, shopD;

    @BeforeEach
    void setUp() {
        // Create items
        milk     = makeItem(1L, "Milk");
        bread    = makeItem(2L, "Bread");
        eggs     = makeItem(3L, "Eggs");
        sugar    = makeItem(4L, "Sugar");
        iceCream = makeItem(5L, "Ice-Cream");

        // ShopA (1,20) → Milk, Bread
        shopA = makeShop(1L, "ShopA", 1, 20, milk, bread);

        // ShopB (10,30) → Eggs
        shopB = makeShop(2L, "ShopB", 10, 30, eggs);

        // ShopC (40,10) → Sugar
        shopC = makeShop(3L, "ShopC", 40, 10, sugar);

        // ShopD (70,-30)→ Ice-Cream
        shopD = makeShop(4L, "ShopD", 70, -30, iceCream);
    }


    //  BASIC RECOMMEND TESTS
    @Test
    void basic_shouldReturnShopWithMostMatchedItems() {
        // ShopA has 2 items (Milk+Bread); others have, 1,
        // So ShopA should win regardless of distance
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC, shopD));

        RecommendRequest request = new RecommendRequest(0, 0, List.of("Milk", "Bread", "Eggs"));
        RecommendResponse response = shopService.recommend(request);

        assertEquals("ShopA", response.getShopName());
        assertEquals(2, response.getMatchedItems());
    }

    @Test
    void basic_shouldReturnNearestWhenMatchCountIsTied() {
        // ShopA (1,20) and ShopB (10,30) both have 1 item from request
        // User at (0,20) → ShopA is closer (dist=1) vs. ShopB (dist≈14)
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB));

        RecommendRequest request = new RecommendRequest(0, 20, List.of("Milk", "Eggs"));
        RecommendResponse response = shopService.recommend(request);

        // Both match 1 item → nearest wins → ShopA
        assertEquals("ShopA", response.getShopName());
    }

    @Test
    void basic_shouldThrowWhenNoItemsMatch() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB));

        // Request item that no shop has
        RecommendRequest request = new RecommendRequest(0, 0, List.of("Chocolate"));

        assertThrows(ResourceNotFoundException.class,
                () -> shopService.recommend(request));
    }

    @Test
    void basic_shouldBeCaseInsensitive() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA));

        // "milk" lowercase should still match "Milk" in DB
        RecommendRequest request = new RecommendRequest(0, 0, List.of("milk", "bread"));
        RecommendResponse response = shopService.recommend(request);

        assertEquals("ShopA", response.getShopName());
        assertEquals(2, response.getMatchedItems());
    }

    @Test
    void basic_distanceShouldBeCorrect() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA));

        // User at (0,0), ShopA at (1,20)
        // Distance = √(1² + 20²) = √401 ≈ 20.02
        RecommendRequest request = new RecommendRequest(0, 0, List.of("Milk"));
        RecommendResponse response = shopService.recommend(request);

        assertEquals(20.02, response.getDistance(), 0.01);
    }

    //  ADVANCED RECOMMEND TESTS

    @Test
    void advanced_shouldVisitNearestShopWithItemsFirst() {
        // User at (20,20)
        // ShopA (1,20) dist=19 → Milk, Bread
        // ShopB (10,30) dist=14 → Eggs ← nearest
        // ShopC (40,10) dist=22 → Sugar
        // ShopB is nearest, so it should be visited first
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC));

        RecommendRequest request = new RecommendRequest(20, 20,
                List.of("Milk", "Bread", "Eggs", "Sugar"));
        List<RecommendResponse> results = shopService.recommendAdvanced(request);

        // The first stop should be ShopB (nearest from user)
        assertEquals("ShopB", results.get(0).getShopName());
    }

    @Test
    void advanced_shouldCoverAllRequestedItems() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC, shopD));

        RecommendRequest request = new RecommendRequest(0, 0,
                List.of("Milk", "Bread", "Eggs", "Sugar", "Ice-Cream"));
        List<RecommendResponse> results = shopService.recommendAdvanced(request);

        // Total matched items across all stops should equal 5
        int totalMatched = results.stream()
                .mapToInt(RecommendResponse::getMatchedItems)
                .sum();

        assertEquals(5, totalMatched);
    }

    @Test
    void advanced_shouldNotRepeatShops() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC));

        RecommendRequest request = new RecommendRequest(0, 0,
                List.of("Milk", "Bread", "Eggs", "Sugar"));
        List<RecommendResponse> results = shopService.recommendAdvanced(request);

        // No shop name should appear twice
        long uniqueShops = results.stream()
                .map(RecommendResponse::getShopName)
                .distinct()
                .count();

        assertEquals(results.size(), uniqueShops);
    }

    @Test
    void advanced_shouldThrowWhenNoShopsHaveItems() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA));

        // Request item no shop has
        RecommendRequest request = new RecommendRequest(0, 0, List.of("Chocolate"));

        assertThrows(ResourceNotFoundException.class,
                () -> shopService.recommendAdvanced(request));
    }

    @Test
    void advanced_cumulativeDistanceShouldIncrease() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC, shopD));

        RecommendRequest request = new RecommendRequest(0, 0,
                List.of("Milk", "Eggs", "Sugar", "Ice-Cream"));
        List<RecommendResponse> results = shopService.recommendAdvanced(request);

        // Each stop's totalDistance should be bigger than the previous
        for (int i = 1; i < results.size(); i++) {
            assertTrue(results.get(i).getTotalDistance()
                    > results.get(i - 1).getTotalDistance());
        }
    }

    @Test
    void advanced_shouldHandleSingleItemRequest() {
        when(shopRepository.findAll()).thenReturn(List.of(shopA, shopB, shopC));

        RecommendRequest request = new RecommendRequest(0, 0, List.of("Eggs"));
        List<RecommendResponse> results = shopService.recommendAdvanced(request);

        assertEquals(1, results.size());
        assertEquals("ShopB", results.get(0).getShopName());
        assertEquals(1, results.get(0).getMatchedItems());
    }

    //  HELPER METHODS
    private Item makeItem(Long id, String name) {
        Item item = new Item();
        item.setId(id);
        item.setName(name);
        return item;
    }

    private Shop makeShop(Long id, String name, double x, double y, Item... items) {
        Shop shop = new Shop();
        shop.setId(id);
        shop.setName(name);
        shop.setXCoordinate(x);
        shop.setYCoordinate(y);
        shop.setItems(new HashSet<>(Set.of(items)));
        return shop;
    }
}