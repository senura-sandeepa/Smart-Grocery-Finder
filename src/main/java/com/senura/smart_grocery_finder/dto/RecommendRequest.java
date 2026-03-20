package com.senura.smart_grocery_finder.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class RecommendRequest {

    private double userX;
    private double userY;
    private List<String> items;

}
