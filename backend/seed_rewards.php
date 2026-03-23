<?php
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

// Clear existing
$db->exec("DELETE FROM rewards");

$rewards = [
    [
        'name' => 'Fitness Zone 1-Day Pass',
        'cost' => 1500,
        'description' => 'Access to any Fitness Zone branch (Hamra, Verdun, Antelias, etc.) for a full day.',
        'type' => 'Subscription',
        'icon' => 'business',
        'image' => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
    ],
    [
        'name' => 'Mike Sport $50 Voucher',
        'cost' => 5000,
        'description' => 'Redeemable at any Mike Sport branch in Lebanon for apparel and gear.',
        'type' => 'Coupon',
        'icon' => 'pricetag',
        'image' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
    ],
    [
        'name' => 'Decathlon $30 Gift Card',
        'cost' => 3000,
        'description' => 'Valid at Decathlon Dbayeh, City Centre, or Le Mall for all sports equipment.',
        'type' => 'Coupon',
        'icon' => 'cart',
        'image' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'
    ],
    [
        'name' => 'Barbell House CrossFit Session',
        'cost' => 2000,
        'description' => 'One drop-in CrossFit session at Barbell House, Mar Mikhael.',
        'type' => 'Program',
        'icon' => 'barbell',
        'image' => 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
    ],
    [
        'name' => 'First Nutrition Protein Kit',
        'cost' => 4500,
        'description' => 'Elite supplement pack including Whey, BCAA, and a shaker from First Nutrition.',
        'type' => 'Supplement',
        'icon' => 'nutrition',
        'image' => 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80'
    ],
    [
        'name' => 'Diet Lab Consultation',
        'cost' => 2500,
        'description' => 'Full body composition analysis and personalized diet plan at Diet Lab.',
        'type' => 'Program',
        'icon' => 'fitness',
        'image' => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
    ],
    [
        'name' => 'Cafe Younes Fit Breakfast',
        'cost' => 1200,
        'description' => 'Fresh avocado toast and organic coffee coupon at any Cafe Younes branch.',
        'type' => 'Coupon',
        'icon' => 'cafe',
        'image' => 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80'
    ],
    [
        'name' => 'Padel Lebanon Court Rental',
        'cost' => 3500,
        'description' => '1-hour court rental for 4 players at Padel Lebanon (Beirut Waterfront).',
        'type' => 'Equipment',
        'icon' => 'tennisball',
        'image' => 'https://images.unsplash.com/photo-1626224580194-860c36f6723c?w=800&q=80'
    ],
    [
        'name' => 'NutriForm 1KG Whey',
        'cost' => 2800,
        'description' => 'Voucher for 1KG of Premium Isolate Whey at NutriForm stores.',
        'type' => 'Supplement',
        'icon' => 'flask',
        'image' => 'https://images.unsplash.com/photo-1593095947771-8bc2014d7a37?w=800&q=80'
    ],
    [
        'name' => 'The Gym (Jounieh) Day Pass',
        'cost' => 1000,
        'description' => 'Full access to gym facilities and swimming pool for one day.',
        'type' => 'Subscription',
        'icon' => 'briefcase',
        'image' => 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80'
    ],
    [
        'name' => 'LMTA Hiking Gear Discount',
        'cost' => 1800,
        'description' => '20% off all hiking gear and tours with Lebanon Mountain Trail Association.',
        'type' => 'Coupon',
        'icon' => 'trail-sign',
        'image' => 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80'
    ],
    [
        'name' => 'Union2 Yoga Session',
        'cost' => 2200,
        'description' => 'One group session of Vinyasa or Hatha Yoga at Union2, Achrafieh.',
        'type' => 'Program',
        'icon' => 'body',
        'image' => 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80'
    ],
    [
        'name' => 'Virgin Megastore Sports Gear',
        'cost' => 4000,
        'description' => 'Voucher for $40 worth of sports electronics or gear at Virgin.',
        'type' => 'Equipment',
        'icon' => 'headset',
        'image' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
    ],
    [
        'name' => 'Healthy Basket Organic Box',
        'cost' => 1500,
        'description' => 'A selection of fresh, organic local produce delivered to your door.',
        'type' => 'Supplement',
        'icon' => 'leaf',
        'image' => 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
    ],
    [
        'name' => 'Fit & Fix 1-Day Meal Plan',
        'cost' => 2000,
        'description' => 'Sample 3 healthy meals and 2 snacks for a full day from Fit & Fix.',
        'type' => 'Program',
        'icon' => 'fast-food',
        'image' => 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80'
    ],
    [
        'name' => 'Edde Sands Pool & Gym',
        'cost' => 6000,
        'description' => 'Weekend access to Edde Sands Jbeil pools, beach, and fitness center.',
        'type' => 'Subscription',
        'icon' => 'sunny',
        'image' => 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80'
    ],
    [
        'name' => 'Sports 4 Ever Accessories',
        'cost' => 800,
        'description' => 'Redeem for jump ropes, bands, or gloves at Sports 4 Ever.',
        'type' => 'Equipment',
        'icon' => 'ribbon',
        'image' => 'https://images.unsplash.com/photo-1517130038641-a774d04afb3c?w=800&q=80'
    ],
    [
        'name' => 'Malaks Sports Resistance Kit',
        'cost' => 1300,
        'description' => 'Full set of multi-level resistance bands from Malaks Sports.',
        'type' => 'Equipment',
        'icon' => 'infinite',
        'image' => 'https://images.unsplash.com/photo-1518611012118-2969c63b07b8?w=800&q=80'
    ],
    [
        'name' => 'Smart Gym Monthly Pass',
        'cost' => 4000,
        'description' => '1 Month access to Smart Gym Lebanon (Dora) with all classes.',
        'type' => 'Subscription',
        'icon' => 'key',
        'image' => 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80'
    ],
    [
        'name' => 'Health Click Smoothie Box',
        'cost' => 900,
        'description' => 'Pack of 5 freshly frozen fruit smoothie mixes from Health Click.',
        'type' => 'Supplement',
        'icon' => 'color-filter',
        'image' => 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&q=80'
    ],
    [
        'name' => 'Smash Tennis (Dbayeh) Session',
        'cost' => 3000,
        'description' => '1-hour private tennis court rental at Smash Club.',
        'type' => 'Program',
        'icon' => 'contract',
        'image' => 'https://images.unsplash.com/photo-1595435064219-510e17d22bc8?w=800&q=80'
    ],
    [
        'name' => 'Beirut Circle Elite Pass',
        'cost' => 7000,
        'description' => 'Annual membership for Beirut Circle, unlocking hundreds of BOGO deals.',
        'type' => 'Subscription',
        'icon' => 'diamond',
        'image' => 'https://images.unsplash.com/photo-1633177317976-3f9bc45e1d1d?w=800&q=80'
    ]
];

foreach ($rewards as $r) {
    try {
        $query = "INSERT INTO rewards (name, cost, description, type, icon, image) VALUES (:name, :cost, :description, :type, :icon, :image)";
        $stmt = $db->prepare($query);
        $stmt->execute($r);
        echo "Inserted Reward: " . $r['name'] . "\n";
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

echo "Rewards seeding complete.";
?>
