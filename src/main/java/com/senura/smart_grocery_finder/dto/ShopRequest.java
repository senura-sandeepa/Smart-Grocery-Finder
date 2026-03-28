package com.senura.smart_grocery_finder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ShopRequest {

    private String name;

    @JsonProperty("xCoordinate")
    private double xCoordinate;

    @JsonProperty("yCoordinate")
    private double yCoordinate;

}
