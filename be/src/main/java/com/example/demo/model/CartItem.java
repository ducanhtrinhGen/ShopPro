package com.example.demo.model;

import java.io.Serializable;

public class CartItem implements Serializable {

    private int productId;
    private String productName;
    private long price;
    private String image;
    private int quantity;

    public CartItem() {
    }

    public CartItem(int productId, String productName, long price, String image, int quantity) {
        this.productId = productId;
        this.productName = productName;
        this.price = price;
        this.image = image;
        this.quantity = quantity;
    }

    public int getProductId() {
        return productId;
    }

    public void setProductId(int productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public long getPrice() {
        return price;
    }

    public void setPrice(long price) {
        this.price = price;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public long getSubtotal() {
        return price * quantity;
    }
}
