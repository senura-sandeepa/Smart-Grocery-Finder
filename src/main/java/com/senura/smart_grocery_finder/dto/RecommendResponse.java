package com.senura.smart_grocery_finder.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecommendResponse {

    private String shopName;
    private int matchedItems;
    private double distance;

}
