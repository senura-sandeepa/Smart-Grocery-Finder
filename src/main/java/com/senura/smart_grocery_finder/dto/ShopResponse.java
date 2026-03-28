package com.senura.smart_grocery_finder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;

@AllArgsConstructor
@Data
public class ShopResponse implements Serializable {
    private final Long id;
    private final String name;

    @JsonProperty("xCoordinate")
    private final double xCoordinate;

    @JsonProperty("yCoordinate")
    private final double yCoordinate;
}