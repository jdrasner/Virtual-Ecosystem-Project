/*
 * Jason Drasner
 * CS 3160
 * Professor Qing Yi
 * Assignment 13 -- Object-oriented Project
 * Project Title: A Virtual Ecosystem
 *
 */

"use strict"

//** Vector Object **//

    // Vector constructor -- a basic directional object
    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }

    // Why use prototype object? Prevents recreating plus() a million times
    Vector.prototype.plus = function(other) {
        return new Vector(this.x + other.x, this.y + other.y);
    };
// End Code for Vector Object


//** Grid Object **//

    // Grid constructor -- object to represent space
    function Grid(width, height) {
        this.space = new Array(width * height);
        this.width = width;
        this.height = height;
    }

    /* Adding in prototype methods to grid prototype object,
       Grid object instances inherit these through the prototype chain */

    Grid.prototype.isInside = function(vector) {
        return vector.x >= 0 && vector.x < this.width &&
             vector.y >= 0 && vector.y < this.height;
    };
    Grid.prototype.get = function(vector) {
        return this.space[vector.x + this.width * vector.y];
    };
    Grid.prototype.set = function(vector, value) {
        this.space[vector.x + this.width * vector.y] = value;
    };
    Grid.prototype.forEach = function(f, context) {
        for (var y = 0; y < this.height; y++) {
          for (var x = 0; x < this.width; x++) {
              var value = this.space[x + y * this.width];
              if (value != null)
                  f.call(context, value, new Vector(x, y));
          } // end inner for loop
        } // end outer for loop
    };
// End of code for Grid Object


//** Creating some direction-related objects, other global odds and ends **//

    // A static object that relates Vectors and string compass directions
    var directions = {
        "n":  new Vector( 0, -1),
        "ne": new Vector( 1, -1),
        "e":  new Vector( 1,  0),
        "se": new Vector( 1,  1),
        "s":  new Vector( 0,  1),
        "sw": new Vector(-1,  1),
        "w":  new Vector(-1,  0),
        "nw": new Vector(-1, -1)
    };

    // Creates an array of direction names
    var directionNames = "n ne e se s sw w nw".split(" ");

    // Creates an object to represent each thing in the world
    function elementFromChar(legend, ch) {
        if (ch == " ")
            return null;
        var element = new legend[ch]();
        element.originChar = ch;
        return element;
    }

    // Reverse of elementFromChar function
    function charFromElement(element) {
        if (element == null)
            return " ";
        else
            return element.originChar;
    }
// End Code for directional stuff


//** World Object -- putting everything together **//

    // World Object Constructor
    function World(map, legend) {
        var grid = new Grid(map[0].length, map.length);
        this.grid = grid;
        this.legend = legend;

        map.forEach(function(line, y) {
            for (var x = 0; x < line.length; x++)
                grid.set(new Vector(x, y),
            elementFromChar(legend, line[x]));
      });
    }

    // Takes the world object and outputs as a string
    World.prototype.toString = function() {
        var output = "";
        for (var y = 0; y < this.grid.height; y++) {
          for (var x = 0; x < this.grid.width; x++) {
            var element = this.grid.get(new Vector(x, y));
            var cFE = charFromElement(element);

            // Trying to add color, not working (creates deprecated font-color html tags)
            //if(cFE == "O")
            //output += cFE.fontcolor("red");

            output += cFE;
          } // end inner for loop

        output += "\n"; // newlines after each width is covered
        } // end outer for loop

        return output;
    };

    World.prototype.turn = function() {
      var acted = [];
      this.grid.forEach(function(lifeform, vector) {
        if (lifeform.act && acted.indexOf(lifeform) == -1) {
          acted.push(lifeform);
          this.letAct(lifeform, vector);
        }
      }, this);
    };

    World.prototype.letAct = function(lifeform, vector) {
      var action = lifeform.act(new View(this, vector));
      if (action && action.type == "move") {
        var dest = this.checkDestination(action, vector);
        if (dest && this.grid.get(dest) == null) {
          this.grid.set(vector, null);
          this.grid.set(dest, lifeform);
        }
      }
    };

    World.prototype.checkDestination = function(action, vector) {
      if (directions.hasOwnProperty(action.direction)) {
        var dest = vector.plus(directions[action.direction]);
        if (this.grid.isInside(dest))
          return dest;
      }
    };
// End Code for World Object


//** View Object -- for looking around **//

    function View(world, vector) {
      this.world = world;
      this.vector = vector;
    }

    View.prototype.look = function(dir) {
      var target = this.vector.plus(directions[dir]);
      if (this.world.grid.isInside(target))
        return charFromElement(this.world.grid.get(target));
      else
        return "#";
    };

    View.prototype.findAll = function(ch) {
      var found = [];
      for (var dir in directions)
        if (this.look(dir) == ch)
          found.push(dir);
      return found;
    };

    View.prototype.find = function(ch) {
      var found = this.findAll(ch);
      if (found.length == 0) return null;
      return randomElement(found);
    };

    // Helper function for View.prototype.find()
    function randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
// End Code for View Object


//** Code for Lifelike World Object **//

    // A container object for the World object
    function LifelikeWorld(map, legend) {
      World.call(this, map, legend);
    }
    LifelikeWorld.prototype = Object.create(World.prototype);

    LifelikeWorld.prototype.letAct = function(lifeform, vector) {
      var action = lifeform.act(new View(this, vector));
      var handled = action &&
        action.type in actionTypes &&
        actionTypes[action.type].call(this, lifeform,
                                      vector, action);
      if (!handled) {
        lifeform.energy -= 0.2;
        if (lifeform.energy <= 0)
          this.grid.set(vector, null);
      }
    };
// End Code for LifelikeWorld Object


//** Single actionTypes object -- contains every action lifeforms can take **//

    var actionTypes = Object.create(null);
    actionTypes.grow = function(lifeform) {
      lifeform.energy += 0.5;
      return true;
    };

    actionTypes.move = function(lifeform, vector, action) {
      var dest = this.checkDestination(action, vector);
      if (dest == null ||
          lifeform.energy <= 1 ||
          this.grid.get(dest) != null)
        return false;
      lifeform.energy -= 1;
      this.grid.set(vector, null);
      this.grid.set(dest, lifeform);
      return true;
    };

    actionTypes.eat = function(lifeform, vector, action) {
      var dest = this.checkDestination(action, vector);
      var atDest = dest != null && this.grid.get(dest);
      if (!atDest || atDest.energy == null)
        return false;
      lifeform.energy += atDest.energy;
      this.grid.set(dest, null);
      return true;
    };

    actionTypes.reproduce = function(lifeform, vector, action) {
      var baby = elementFromChar(this.legend,
                                 lifeform.originChar);
      var dest = this.checkDestination(action, vector);
      if (dest == null ||
          lifeform.energy <= 2 * baby.energy ||
          this.grid.get(dest) != null)
        return false;
      lifeform.energy -= 2 * baby.energy;
      this.grid.set(dest, baby);
      return true;
    };
// End Code for actionTypes Object


//*** Code for Lifeforms in the virtual ecosystem ***///

//** Plant Lifeform **//

    // Plant constructor
    function Plant() {
      this.energy = 3 + Math.random() * 4;
    }

    // Photosynthesis of sorts
    Plant.prototype.act = function(view) {
      if (this.energy > 15) {
        var space = view.find(" ");
        if (space)
          return {type: "reproduce", direction: space};
      }
      if (this.energy < 20)
        return {type: "grow"};
    };
// End Plant Lifeform


//** Rabbit Lifeform -- eats Plants **//

    // Rabbit constructor
    function Rabbit() {
        this.energy = 20;  // Plant eater energy level
        this.dir = "e";    // Default direction for dirPlus function
        this.eatCount = 0; // Prevents plant eaters from eating too much
    }

    // Act method containing the logic for Rabbits in the world
    Rabbit.prototype.act = function(view) {
        var space = view.find(" "); // See if there is empty space around
        var plant = view.find("*"); // See if there is a single plant around
        var start = this.dir;       // Default start direction for dirPlus
      
        // Eco-friendly "gene" - see if there is at most one plant around
        if(view.findAll("*").length <= 1) {plant = false;}
        
        // High energy level behavior - "get busy" (> 82)
        if(space && this.energy > 82) {
            return {type: "reproduce", direction: space};
            if(this.eatCount >= 1) this.eatCount--;
        }
        
        // Normal energy level behavior (btw. 30 and 82)
        if(this.energy > 30) {
            if (view.look(dirPlus(this.dir, -3)) != " ") {
                start = this.dir = dirPlus(this.dir, -2);
            }
            while (view.look(this.dir) != " ") {
                this.dir = dirPlus(this.dir, 1);
                if (this.dir == start) break;
            }
            if(!plant)
                return {type: "move", direction: this.dir};
                if(this.eatCount > 0) this.eatCount--;
            
            if(plant && this.energy >= 75) {
                return {type: "move", direction: this.dir};
                this.eatCount++;
            }
            if(plant && this.energy < 75 && this.eatCount < 7) {
                return {type: "eat", direction: plant};
                this.eatCount++;
            }
            
        } // End normal energy level behavior
        
        // Low energy level behavior - desperation time (< 30)
        if(this.energy <= 30) {
            if (view.look(dirPlus(this.dir, -3)) != " ") {
                start = this.dir = dirPlus(this.dir, -2);
            }
            while (view.look(this.dir) != " ") {
                this.dir = dirPlus(this.dir, 1);
                if (this.dir == start) break;
            }
            if(!plant) {
                return {type: "move", direction: this.dir}
                if(this.eatCount >= 1) this.eatCount--;
            }
            if(plant) {
                return {type: "eat", direction: plant};
                this.eatCount++;
            }

        } // End low energy level behavior
        
        // Dying level desperation (< 25)
        if(this.energy < 25)
          this.eatCount = 0;
            
        // Default random movement case
        if(space && !plant)
          return {type: "move", direction: space};
    }; // End Code for Rabbit.prototype.act

    // Helper function for clockwise movement
    function dirPlus(dir, n) {
      var index = directionNames.indexOf(dir);
      return directionNames[(index + n + 8) % 8];
    }
// End Code for Rabbit Lifeform


//** Carnivore Lifeform named ManBearPig -- eats Rabbits
    function ManBearPig() {
        this.energy = 100;     // Energy level of the predator
        this.dir = "s";        // Default direction
        this.eatNow = true;    // For less greedy eating
        this.actionCount = 0;  // For the "hunting gene"
    }

    ManBearPig.prototype.act = function(view) {
        var space = view.find(" "); // See if there is empty space around
        var lunch = view.find("O"); // See if there is a single plant eater around
        this.actionCount++;
        if(this.actionCount % 10 == 0) // Random movement every tenth turn - "hunting gene"
          return {type: "move", direction: "space"};
    
        // eatNow helpers - limits eating behavior
        if (this.energy > 190)
          this.eatNow = false;

        if(this.energy < 90)
          this.eatNow = true;

        // High energy level behavior - "get busy" (>= 235)
        if(this.energy >= 240) {
            if(space){
              return {type: "reproduce", direction: space};
            }
            if(!space)
              return;
        } // End High energy level behavior
      
        // Normal energy level behavior
        if(this.energy < 240) {
            var start = this.dir;
            if (view.look(dirPlus(this.dir, 3)) != " ") { // reversed direction of movement from Rabbits
                start = this.dir = dirPlus(this.dir, 2);
            }
            while (view.look(this.dir) != " ") {
                this.dir = dirPlus(this.dir, -1);
                if (this.dir == start) break;
            }
            if(lunch && this.eatNow) {
              return {type:"eat", direction: lunch};
            }
            if(!lunch && space) {
                return {type:"move", direction: this.dir};
            }
            if(!lunch && !space) {
                return;
            }
        } // End Normal energy level behavior


        // Low energy level behavior -- desperation time
        if (this.energy < 30) {
            if(lunch && this.eatNow) {
                return {type:"eat", direction: lunch};
            }
            if(!lunch && space)
                return {type:"move", direction: space}; // random movement - desperate hunting time
            if(!lunch && !space)
                return;
        } // End Low energy level behavior

        // Default random movement case
        if(space)
            return {type: "move", direction: space};

    } // End ManBearPig.prototype.act()

// End Code for ManBearPig Lifeform

// End Code for Lifeforms in the ecosystem

// Simple constructor for the wall object - has no properties
function Wall() {}

//** Last step -- Creating a large LifelikeWorld object **//
var myWorld = new LifelikeWorld(   
    ["##############################################################",
     "#                 ####         ****                        ###",
     "#   *  M  ##                 ########       OO              ##",
     "#   *    ##        O O                 ****                **#",
     "#       ##*                        ##########              **#",
     "#      ##***  *         ****                               **#",
     "#* **  #  *  ***      #########                            **#",
     "#* **  #      *               #   *                        **#",
     "#     ##              #   O   #  ***                    ######",
     "#*            M       #       #   *   O     O           #    #",
     "#*                    #  ######                           ** #",
     "###          ****          ***                            ** #",
     "#       O                        M         O                 #",
     "#   *     ##  ##  ##  ##               ###                *  #",
     "#   **         #              *       #####  O               #",
     "##  **  O   O  #  #    ***  ***        ###*               ** #",
     "###            #   #   *****      O     ##**        ***  ****#",
     "#             ##         ****           ######               #",
     "#    *        O#                         * ####            O #",
     "#              ##                            #### O          #",
     "######          ##        ##                 *#####          #",
     "# ***#                    **  *              ***#####  * * O #",
     "# ***#                *        **O         ******      *   * #",
     "#   O                         ****          **    O    *     #",
     "##############################################################"],


    {"#": Wall,
     "M": ManBearPig,
     "O": Rabbit,
     "*": Plant}
);