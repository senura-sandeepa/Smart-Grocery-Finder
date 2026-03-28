package com.senura.smart_grocery_finder.service;

import com.senura.smart_grocery_finder.dto.*;
import com.senura.smart_grocery_finder.entity.Item;
import com.senura.smart_grocery_finder.entity.Shop;
import com.senura.smart_grocery_finder.exception.ResourceNotFoundException;
import com.senura.smart_grocery_finder.repository.ItemRepository;
import com.senura.smart_grocery_finder.repository.ShopRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@AllArgsConstructor
@Service
public class ItemService {

    private final ItemRepository itemRepository;
    private final ShopRepository shopRepository;

    // Create a new item
    public ItemResponse createItem(ItemRequest request) {
        Item item = new Item();
        item.setName(request.getName());
        Item saved = itemRepository.save(item);
        return new ItemResponse(saved.getId(), saved.getName());

    }

    // Get all items
    public List<ItemResponse> getAllItems() {
        return itemRepository.findAll()
                .stream()
                .map(item -> new ItemResponse(item.getId(), item.getName()))
                .collect(Collectors.toList());
    }


    // Delete item by id
    public void deleteItem(Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));

        // Remove item from all shops first
        List<Shop> shops = shopRepository.findAll();
        for (Shop shop : shops) {
            shop.getItems().remove(item);
            shopRepository.save(shop);
        }

        itemRepository.delete(item);
    }

}
