///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
/** 
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter. 
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan(interpretations : Interpreter.InterpretationResult[], currentState : WorldState) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The core planner function. The code here is just a template;
     * you should rewrite this function entirely. In this template,
     * the code produces a dummy plan which is not connected to the
     * argument `interpretation`, but your version of the function
     * should be such that the resulting plan depends on
     * `interpretation`.
     *
     * 
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
        // This function returns a dummy plan involving a random stack
        var plan : string[] = [];
        //A DNFFormula is a list of lists.
        //A goal state must satisfy all requirements of at least one of these lists.
        //alert (state.stacks);
        var isGoal = (n:WorldState)=>
            {for (var i = 0; i<interpretation.length;i++){
                var adheres:boolean = true;
                for (var j = 0; j<interpretation[i].length;j++){
                    //TODO
                    //set adheres to false if state does not fulfill requirements
                    var int : Interpreter.Literal = interpretation[i][j];
                    switch (int.relation){
                        case "holding": if ((n.holding!==int.args[0] && int.polarity)||
                                            (state.holding ==int.args[0] && !int.polarity))
                                                adheres=false;
                                        break;
                        case "inside": //let's pretend that this does not happen unnecessarily
                        case "ontop":   adheres = Interpreter.isOntop(int.args[0], int.args[1], n);
                                        break;
                        case "above":break;
                        case "under":break;
                        case "beside":break;
                        case "left of": break;
                        case "right of": break;
                        default: throw new Error("Missed a case: " + interpretation[i][j].relation);
                    }
                }
                if (adheres) return adheres;
            };
            return false;}
        console.log("About to begin search");
        var searchResult : SearchResult<WorldState> 
            = aStarSearch<WorldState>(new myGraph,
                                      state,
                                      isGoal,
                                      //TODO invent heuristic
                                      (n:WorldState)=>0,
                                      10); 
        //now take the search result and turn it into a set of moves
        plan.push("Found the following result:" + searchResult);
        for (var i = 0; i<searchResult.path.length-1; i++){
            var graph: myGraph = new myGraph;
            var edges: AnnotatedEdge[] = graph.outgoingEdges(searchResult.path[i]);
            for (var edge = 0; edge<edges.length; edge++){
                if (graph.compareNodes(edges[edge].to, searchResult.path[i+1])==0)
                    plan.push(edges[edge].action);
            }
            //plan.push(searchResult.path[i].action);
        }
        /*do {
            var pickstack = Math.floor(Math.random() * state.stacks.length);
        } while (state.stacks[pickstack].length == 0);
        
        //plan.push("r");
        // First move the arm to the leftmost nonempty stack
        if (pickstack < state.arm) {
            
            plan.push("Moving left");
            for (var i = state.arm; i > pickstack; i--) {
                plan.push("l");
            }
        } else if (pickstack > state.arm) {
            plan.push("Moving right");
            for (var i = state.arm; i < pickstack; i++) {
                plan.push("r");
            }
        }

        // Then pick up the object
        var obj = state.stacks[pickstack][state.stacks[pickstack].length-1];
        plan.push("Picking up the " + state.objects[obj].form,
                  "p");

        if (pickstack < state.stacks.length-1) {
            // Then move to the rightmost stack
            plan.push("Moving as far right as possible");
            for (var i = pickstack; i < state.stacks.length-1; i++) {
                plan.push("r");
            }

            // Then move back
            plan.push("Moving back");
            for (var i = state.stacks.length-1; i > pickstack; i--) {
                plan.push("l");
            }
        }

        // Finally put it down again
        plan.push("Dropping the " + state.objects[obj].form,
                  "d");
                  */
        return plan;
    }
    
    class myGraph implements Graph<WorldState>{
        outgoingEdges(node:WorldState): AnnotatedEdge[]{
            var result: AnnotatedEdge[]=[];
            //there can be at most four edges; one for each action l, r, p, d.
            //for each action, calculate whether the action is permissible;
            //if so, add edge.
            //if we are not at the leftmost point, we can move left
            if (node.arm){
                var nextNode: WorldState = copyWorld(node);
                nextNode.arm-=1;
                result.push({action:"l", from:node, to:nextNode, cost:1});
            }
            //if we are not at the rightmost point, we can move right
            if (node.arm<node.stacks.length-1){
                var nextNode: WorldState = copyWorld(node);
                nextNode.arm+=1;
                result.push({action:"r", from:node, to:nextNode, cost:1});
            }
            //now if we can drop something we plainly can't pick up anything and vice versa
            if (node.holding!=null){
                var nextNode: WorldState = copyWorld(node);
                nextNode.stacks[nextNode.arm].push(nextNode.holding);
                nextNode.holding=null;
                result.push({action:"d", from:node, to:nextNode, cost:1});
            }
            else if (node.stacks[node.arm].length) {
                var nextNode: WorldState = copyWorld(node);
                nextNode.holding = nextNode.stacks[nextNode.arm].pop();
                result.push({action:"p", from:node, to:nextNode, cost:1});
            }
            return result;
        }
        compareNodes : collections.ICompareFunction<WorldState> = 
            function (a: WorldState, b: WorldState): number{
                for (var i = 0; i<a.stacks.length; i++){
                    for (var j = 0; j<a.stacks[i].length; j++){
                        if (a.stacks[i][j]!==b.stacks[i][j])
                            return 1;
                    }
                }
                if (a.holding!==b.holding) return 1;
                if (a.arm!==b.arm) return 1;
                return 0;
            };
    }
    
    class AnnotatedEdge extends Edge<WorldState>{
        action: string;
    }
    //deep copy function
    function copyWorld(world:WorldState):WorldState{
        var s:Stack[]=[];
        for (var i = 0; i<world.stacks.length; i++){
            var stack:Stack=[];
            for (var j = 0; j<world.stacks[i].length; j++){
                stack.push(world.stacks[i][j]);
            }
            s.push(stack);
        }
        return {
            stacks:s,
            holding:world.holding,
            arm:world.arm,
            objects:world.objects,
            examples:world.examples
        };
    }

}
