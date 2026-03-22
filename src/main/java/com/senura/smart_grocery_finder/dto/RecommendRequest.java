package com.senura.smart_grocery_finder.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class RecommendRequest {

    private double userX;
    private double userY;

    @NotEmpty(message = "Item list cannot be empty")
    private List<String> items;

}
