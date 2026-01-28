<?php
header('Content-Type: application/json');

require __DIR__ . '/config.php';

// Read JSON body
$input = json_decode(file_get_contents('php://input'), true);

$provider_id = isset($input['provider_id']) ? (int)$input['provider_id'] : null;
$product_name = isset($input['product_name']) ? trim($input['product_name']) : '';
$product_description = isset($input['product_description']) ? trim($input['product_description']) : null;
$price = isset($input['price']) ? $input['price'] : null;
$stock_quantity = isset($input['stock_quantity']) ? (int)$input['stock_quantity'] : 0;
$category = isset($input['category']) ? trim($input['category']) : null;

// Basic validation
if (!$provider_id || $provider_id < 1) {
  echo json_encode(['success' => false, 'error' => 'provider_id is required and must be positive']);
  exit;
}
if ($product_name === '') {
  echo json_encode(['success' => false, 'error' => 'product_name is required']);
  exit;
}
if ($price === null || !is_numeric($price) || $price < 0) {
  echo json_encode(['success' => false, 'error' => 'price is required and must be a non-negative number']);
  exit;
}
if ($stock_quantity < 0) {
  echo json_encode(['success' => false, 'error' => 'stock_quantity must be non-negative']);
  exit;
}

// Insert
try {
  $stmt = $pdo->prepare("
    INSERT INTO products (provider_id, product_name, product_description, price, stock_quantity, category)
    VALUES (:provider_id, :product_name, :product_description, :price, :stock_quantity, :category)
  ");
  $stmt->execute([
    ':provider_id' => $provider_id,
    ':product_name' => $product_name,
    ':product_description' => $product_description,
    ':price' => number_format((float)$price, 2, '.', ''),
    ':stock_quantity' => $stock_quantity,
    ':category' => $category
  ]);

  echo json_encode(['success' => true, 'product_id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
  // Most common error here is a foreign key violation if provider_id doesn't exist
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => $e->getCode() === '23000'
    ? 'Insert failed (check provider_id exists due to FK constraint)'
    : 'Insert failed']);
}
