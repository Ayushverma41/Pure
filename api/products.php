<?php
require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = json_input();
$products = read_csv_assoc($PRODUCT_CSV);

if ($method === 'GET' && $action === 'list') {
  $mapped = array_map(function ($p) {
    $gallery = [];
    if (!empty($p['gallery_json'])) {
      $tmp = json_decode($p['gallery_json'], true);
      if (is_array($tmp)) $gallery = $tmp;
    }
    return [
      'id' => $p['id'],
      'name' => $p['name'],
      'category' => $p['category'],
      'price' => (float)$p['price'],
      'image' => $p['image'],
      'gallery' => $gallery,
      'rating' => (float)($p['rating'] ?: 4.5),
      'desc' => $p['desc'],
      'seller_email' => $p['seller_email']
    ];
  }, $products);
  send_json(200, ['ok' => true, 'products' => $mapped]);
}

if ($method === 'GET' && $action === 'seller-list') {
  $email = normalize_email($_GET['sellerEmail'] ?? '');
  if (!$email) send_json(400, ['ok' => false, 'message' => 'sellerEmail required']);
  $mine = array_values(array_filter($products, function ($p) use ($email) {
    return normalize_email($p['seller_email'] ?? '') === $email;
  }));
  send_json(200, ['ok' => true, 'products' => $mine]);
}

if ($method === 'POST' && $action === 'add') {
  $sellerEmail = normalize_email($input['sellerEmail'] ?? '');
  $name = trim((string)($input['name'] ?? ''));
  $category = trim((string)($input['category'] ?? ''));
  $price = (float)($input['price'] ?? 0);
  $image = trim((string)($input['image'] ?? ''));
  $desc = trim((string)($input['desc'] ?? ''));

  if (!$sellerEmail || !$name || !$category || $price <= 0) {
    send_json(400, ['ok' => false, 'message' => 'sellerEmail, name, category and valid price required']);
  }

  $id = 'product-' . time() . '-' . bin2hex(random_bytes(3));
  $now = gmdate('c');
  $row = [
    'id' => $id,
    'name' => $name,
    'category' => $category,
    'price' => $price,
    'image' => $image ?: 'image/Offer/01.png',
    'gallery_json' => json_encode([$image ?: 'image/Offer/01.png']),
    'rating' => 4.5,
    'desc' => $desc ?: 'Seller listed product',
    'seller_email' => $sellerEmail,
    'created_at' => $now,
    'updated_at' => $now
  ];

  $products[] = $row;
  write_csv_assoc($PRODUCT_CSV, $products, ['id','name','category','price','image','gallery_json','rating','desc','seller_email','created_at','updated_at']);
  send_json(201, ['ok' => true, 'product' => $row]);
}

if ($method === 'POST' && $action === 'update') {
  $sellerEmail = normalize_email($input['sellerEmail'] ?? '');
  $id = trim((string)($input['id'] ?? ''));
  if (!$sellerEmail || !$id) send_json(400, ['ok' => false, 'message' => 'sellerEmail and id required']);

  $found = false;
  for ($i = 0; $i < count($products); $i++) {
    if (($products[$i]['id'] ?? '') !== $id) continue;
    if (normalize_email($products[$i]['seller_email'] ?? '') !== $sellerEmail) {
      send_json(403, ['ok' => false, 'message' => 'Cannot update this product']);
    }

    $name = trim((string)($input['name'] ?? ''));
    $category = trim((string)($input['category'] ?? ''));
    $image = trim((string)($input['image'] ?? ''));
    $desc = trim((string)($input['desc'] ?? ''));
    $priceRaw = $input['price'] ?? null;

    if ($name !== '') $products[$i]['name'] = $name;
    if ($category !== '') $products[$i]['category'] = $category;
    if ($image !== '') {
      $products[$i]['image'] = $image;
      $products[$i]['gallery_json'] = json_encode([$image]);
    }
    if ($desc !== '') $products[$i]['desc'] = $desc;
    if ($priceRaw !== null && $priceRaw !== '') {
      $price = (float)$priceRaw;
      if ($price <= 0) send_json(400, ['ok' => false, 'message' => 'Invalid price']);
      $products[$i]['price'] = $price;
    }
    $products[$i]['updated_at'] = gmdate('c');
    $found = true;
    break;
  }

  if (!$found) send_json(404, ['ok' => false, 'message' => 'Product not found']);

  write_csv_assoc($PRODUCT_CSV, $products, ['id','name','category','price','image','gallery_json','rating','desc','seller_email','created_at','updated_at']);
  send_json(200, ['ok' => true, 'message' => 'Product updated']);
}

if ($method === 'POST' && $action === 'delete') {
  $sellerEmail = normalize_email($input['sellerEmail'] ?? '');
  $id = trim((string)($input['id'] ?? ''));
  if (!$sellerEmail || !$id) send_json(400, ['ok' => false, 'message' => 'sellerEmail and id required']);

  $next = [];
  $found = false;
  foreach ($products as $p) {
    if (($p['id'] ?? '') === $id) {
      if (normalize_email($p['seller_email'] ?? '') !== $sellerEmail) {
        send_json(403, ['ok' => false, 'message' => 'Cannot delete this product']);
      }
      $found = true;
      continue;
    }
    $next[] = $p;
  }

  if (!$found) send_json(404, ['ok' => false, 'message' => 'Product not found']);

  write_csv_assoc($PRODUCT_CSV, $next, ['id','name','category','price','image','gallery_json','rating','desc','seller_email','created_at','updated_at']);
  send_json(200, ['ok' => true, 'message' => 'Product removed']);
}

send_json(404, ['ok' => false, 'message' => 'Invalid product route']);