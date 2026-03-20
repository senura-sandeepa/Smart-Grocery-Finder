package com.senura.smart_grocery_finder.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ItemRequest {

    @NotBlank(message = "Item name cannot be blank")
    private String name;

}
