CREATE TABLE shop_items (
                            shop_id BIGINT NOT NULL,
                            item_id BIGINT NOT NULL,
                            PRIMARY KEY (shop_id, item_id),
                            FOREIGN KEY (shop_id) REFERENCES shops(id),
                            FOREIGN KEY (item_id) REFERENCES items(id)
);