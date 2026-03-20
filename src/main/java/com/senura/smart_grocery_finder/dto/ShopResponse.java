package com.senura.smart_grocery_finder.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;

@AllArgsConstructor
@Data
public class ShopResponse implements Serializable {
    private final Long id;
    private final String name;
    private final double xCoordinate;
    private final double yCoordinate;
}