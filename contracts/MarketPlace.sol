// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract DecentralizedMarketplace {
    struct User {
        string username;
        bool exists;
    }

    struct Item {
        string name;
        string description;
        uint256 price;
        address payable owner;
        bool available;
        bool withdrawn;
    }

    struct Transaction {
        uint256 itemId;
        address buyer;
        uint256 price;
    }

    mapping(address => User) public users;
    mapping(uint256 => Item) public items;
    mapping(address => uint256[]) public userItems;
    mapping(address => Transaction[]) public userPurchases;
    uint256 public itemCount;

    event UserRegistered(address indexed user, string username);
    event ItemListed(uint256 indexed itemId, string name, uint256 price, address owner);
    event ItemPurchased(uint256 indexed itemId, address buyer);
    event FundsWithdrawn(address indexed user, uint256 amount);

    modifier onlyRegisteredUser() {
        require(users[msg.sender].exists, "User not registered");
        _;
    }

    function registerUser(string memory _username) public {
        require(!users[msg.sender].exists, "User already registered");
        users[msg.sender] = User(_username, true);
        emit UserRegistered(msg.sender, _username);
    }

    function listItem(string memory _name, string memory _description, uint256 _price) public onlyRegisteredUser {
        require(_price > 0, "Price must be greater than zero");
        items[itemCount] = Item(_name, _description, _price, payable(msg.sender), true, false);
        userItems[msg.sender].push(itemCount);
        emit ItemListed(itemCount, _name, _price, msg.sender);
        itemCount++;
    }

    function purchaseItem(uint256 _itemId) public payable onlyRegisteredUser {
        Item storage item = items[_itemId];
        require(item.available, "Item not available");
        require(msg.value == item.price, "Incorrect price");

        userPurchases[msg.sender].push(Transaction(_itemId, msg.sender, msg.value));
        item.available = false;
        item.owner = payable(msg.sender);

        emit ItemPurchased(_itemId, msg.sender);
    }

    function getItem(uint256 _itemId) public view returns (string memory, string memory, uint256, address, bool) {
        Item storage item = items[_itemId];
        return (item.name, item.description, item.price, item.owner, item.available);
    }

    function withdrawFunds() public onlyRegisteredUser {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < userItems[msg.sender].length; i++) {
            uint256 itemId = userItems[msg.sender][i];
            if (!items[itemId].available && !items[itemId].withdrawn) {
                totalAmount += items[itemId].price;
                items[itemId].withdrawn = true; // Mark as withdrawn
            }
        }
        require(totalAmount > 0, "No funds to withdraw");
        payable(msg.sender).transfer(totalAmount);
        emit FundsWithdrawn(msg.sender, totalAmount);
    }

    function getUserPurchases(address _user) public view returns (Transaction[] memory) {
        return userPurchases[_user];
    }

    function getUserItems(address _user) public view returns (uint256[] memory) {
        return userItems[_user];
    }
}