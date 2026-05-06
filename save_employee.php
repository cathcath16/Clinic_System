<?php
include 'db.php'; // I-connect ang database

// Kuhaon ang data gikan sa JavaScript
$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    $id = $data['id'];
    $name = $data['name'];
    $office = $data['office'];
    $category = $data['category'];

    // SQL code para i-insert ang data
    $sql = "INSERT INTO employees (id, name, office, category) 
            VALUES ('$id', '$name', '$office', '$category')
            ON DUPLICATE KEY UPDATE name='$name', office='$office', category='$category'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}
?>