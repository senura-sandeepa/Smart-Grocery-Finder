package com.senura.smart_grocery_finder.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecommendResponse {

    private String shopName;
    private int matchedItems;
    private double distance;
    private Double totalDistance;

    // Constructor for basic recommendation
    public RecommendResponse(String shopName, int matchedItems, double distance) {
        this.shopName = shopName;
        this.matchedItems = matchedItems;
        this.distance = distance;
        this.totalDistance = null; // no total distance in basic algo
    }

}
