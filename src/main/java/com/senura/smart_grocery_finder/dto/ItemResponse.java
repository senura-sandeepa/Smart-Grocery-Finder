package com.senura.smart_grocery_finder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class ItemResponse {

    private Long id;
    private String name;

}