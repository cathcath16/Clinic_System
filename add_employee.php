<?php
header("Content-Type: application/json");
include 'db.php'; // Siguraduha nga naa na kay db.php

$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    $id = $conn->real_escape_string($data['id']);
    $name = $conn->real_escape_string($data['name']);
    $office = $conn->real_escape_string($data['office']);
    $category = $conn->real_escape_string($data['category']);
    $gender = $conn->real_escape_string($data['gender']);
    $age = (int)$data['age'];

    $sql = "INSERT INTO employees (id, name, office, category, gender, age) 
            VALUES ('$id', '$name', '$office', '$category', '$gender', $age)
            ON DUPLICATE KEY UPDATE name='$name', office='$office'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["status" => "success", "message" => "Saved successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}
$conn->close();
?>