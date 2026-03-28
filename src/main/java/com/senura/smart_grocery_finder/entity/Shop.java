package com.senura.smart_grocery_finder.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@Table(name = "shops")
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "x_coordinate")
    @JsonProperty("xCoordinate")
    private double xCoordinate;

    @Column(name = "y_coordinate")
    @JsonProperty("yCoordinate")
    private double yCoordinate;

    @ManyToMany
    @JoinTable(
            name = "shop_items",
            joinColumns = @JoinColumn(name = "shop_id"),
            inverseJoinColumns = @JoinColumn(name = "item_id")
    )
    private Set<Item> items = new HashSet<>();

}
