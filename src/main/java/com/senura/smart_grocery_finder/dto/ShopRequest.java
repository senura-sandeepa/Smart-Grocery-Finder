package com.senura.smart_grocery_finder.dto;

import lombok.Data;

@Data
public class ShopRequest {

    private String name;
    private double xCoordinate;
    private double yCoordinate;

}
