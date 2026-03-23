<?php
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

if(!$db) {
    die("FAILURE: Could not connect to the database.\n");
}

$sql = file_get_contents('schema.sql');

try {
    // PDO::exec() can execute multiple queries if the driver supports it, 
    // but often it's better to split by semicolon if there are issues.
    // However, schema.sql has triggers and complex structures.
    // We'll try a simple exec first.
    
    $db->exec($sql);
    echo "SUCCESS: Schema applied successfully!\n";
} catch(PDOException $e) {
    echo "ERROR applying schema: " . $e->getMessage() . "\n";
    echo "Trying alternative: Split queries...\n";
    
    // Fallback: Split by semicolon (crude but often works for basic schemas)
    // Note: This might break on triggers/procedures, but our schema is relatively simple.
    $queries = explode(";", $sql);
    foreach($queries as $query) {
        $query = trim($query);
        if(!empty($query)) {
            try {
                $db->exec($query);
            } catch(PDOException $ex) {
                echo "Warning on query: " . substr($query, 0, 50) . "... Error: " . $ex->getMessage() . "\n";
            }
        }
    }
    echo "Schema application finished.\n";
}
?>
