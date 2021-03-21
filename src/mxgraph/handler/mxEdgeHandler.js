/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 */
import mxCellMarker from "./mxCellMarker";
import mxPoint from "../util/mxPoint";
import mxConstants from "../util/mxConstants";
import mxUtils from "../util/mxUtils";
import mxImageShape from "../shape/mxImageShape";
import mxRectangleShape from "../shape/mxRectangleShape";
import mxConnectionConstraint from "../view/mxConnectionConstraint";
import mxEvent from "../util/mxEvent";
import mxConstraintHandler from "./mxConstraintHandler";

class mxEdgeHandler {
  /**
   * Variable: graph
   *
   * Reference to the enclosing <mxGraph>.
   */
  graph = null;

  /**
   * Variable: state
   *
   * Reference to the <mxCellState> being modified.
   */
  state = null;

  /**
   * Variable: marker
   *
   * Holds the <mxTerminalMarker> which is used for highlighting terminals.
   */
  marker = null;

  /**
   * Variable: constraintHandler
   *
   * Holds the <mxConstraintHandler> used for drawing and highlighting
   * constraints.
   */
  constraintHandler = null;

  /**
   * Variable: error
   *
   * Holds the current validation error while a connection is being changed.
   */
  error = null;

  /**
   * Variable: shape
   *
   * Holds the <mxShape> that represents the preview edge.
   */
  shape = null;

  /**
   * Variable: bends
   *
   * Holds the <mxShapes> that represent the points.
   */
  bends = null;

  /**
   * Variable: labelShape
   *
   * Holds the <mxShape> that represents the label position.
   */
  labelShape = null;

  /**
   * Variable: cloneEnabled
   *
   * Specifies if cloning by control-drag is enabled. Default is true.
   */
  cloneEnabled = true;

  /**
   * Variable: addEnabled
   *
   * Specifies if adding bends by shift-click is enabled. Default is false.
   * Note: This experimental feature is not recommended for production use.
   */
  addEnabled = false;

  /**
   * Variable: removeEnabled
   *
   * Specifies if removing bends by shift-click is enabled. Default is false.
   * Note: This experimental feature is not recommended for production use.
   */
  removeEnabled = false;

  /**
   * Variable: dblClickRemoveEnabled
   *
   * Specifies if removing bends by double click is enabled. Default is false.
   */
  dblClickRemoveEnabled = false;

  /**
   * Variable: mergeRemoveEnabled
   *
   * Specifies if removing bends by dropping them on other bends is enabled.
   * Default is false.
   */
  mergeRemoveEnabled = false;

  /**
   * Variable: straightRemoveEnabled
   *
   * Specifies if removing bends by creating straight segments should be enabled.
   * If enabled, this can be overridden by holding down the alt key while moving.
   * Default is false.
   */
  straightRemoveEnabled = false;

  /**
   * Variable: virtualBendsEnabled
   *
   * Specifies if virtual bends should be added in the center of each
   * segments. These bends can then be used to add new waypoints.
   * Default is false.
   */
  virtualBendsEnabled = false;

  /**
   * Variable: virtualBendOpacity
   *
   * Opacity to be used for virtual bends (see <virtualBendsEnabled>).
   * Default is 20.
   */
  virtualBendOpacity = 20;

  /**
   * Variable: parentHighlightEnabled
   *
   * Specifies if the parent should be highlighted if a child cell is selected.
   * Default is false.
   */
  parentHighlightEnabled = false;

  /**
   * Variable: preferHtml
   *
   * Specifies if bends should be added to the graph container. This is updated
   * in <init> based on whether the edge or one of its terminals has an HTML
   * label in the container.
   */
  preferHtml = false;

  /**
   * Variable: allowHandleBoundsCheck
   *
   * Specifies if the bounds of handles should be used for hit-detection in IE
   * Default is true.
   */
  allowHandleBoundsCheck = true;

  /**
   * Variable: snapToTerminals
   *
   * Specifies if waypoints should snap to the routing centers of terminals.
   * Default is false.
   */
  snapToTerminals = false;

  /**
   * Variable: handleImage
   *
   * Optional <mxImage> to be used as handles. Default is null.
   */
  handleImage = null;

  /**
   * Variable: tolerance
   *
   * Optional tolerance for hit-detection in <getHandleForEvent>. Default is 0.
   */
  tolerance = 0;

  /**
   * Variable: outlineConnect
   *
   * Specifies if connections to the outline of a highlighted target should be
   * enabled. This will allow to place the connection point along the outline of
   * the highlighted target. Default is false.
   */
  outlineConnect = false;

  /**
   * Variable: manageLabelHandle
   *
   * Specifies if the label handle should be moved if it intersects with another
   * handle. Uses <checkLabelHandle> for checking and moving. Default is false.
   */
  manageLabelHandle = false;
  /**
   * Function: isParentHighlightVisible
   *
   * Returns true if the parent highlight should be visible. This implementation
   * always returns true.
   */
  isParentHighlightVisible = isParentHighlightVisible;
  /**
   * Function: updateParentHighlight
   *
   * Updates the highlight of the parent if <parentHighlightEnabled> is true.
   */
  updateParentHighlight = updateParentHighlight;

  /**
   * Class: mxEdgeHandler
   *
   * Graph event handler that reconnects edges and modifies control points and
   * the edge label location. Uses <mxTerminalMarker> for finding and
   * highlighting new source and target vertices. This handler is automatically
   * created in <mxGraph.createHandler> for each selected edge.
   *
   * To enable adding/removing control points, the following code can be used:
   *
   * (code)
   * addEnabled = true;
   * removeEnabled = true;
   * (end)
   *
   * Note: This experimental feature is not recommended for production use.
   *
   * Constructor: mxEdgeHandler
   *
   * Constructs an edge handler for the specified <mxCellState>.
   *
   * Parameters:
   *
   * state - <mxCellState> of the cell to be handled.
   */
  constructor(state) {
    if (state != null && state.shape != null) {
      this.state = state;
      this.init();

      // Handles escape keystrokes
      this.escapeHandler = (sender, evt) => {
        let dirty = this.index != null;
        this.reset();

        if (dirty) {
          this.graph.cellRenderer.redraw(this.state, false, state.view.isRendering());
        }
      };

      this.state.view.graph.addListener(mxEvent.ESCAPE, this.escapeHandler);
    }
  };

  /**
   * Function: init
   *
   * Initializes the shapes required for this edge handler.
   */
  init = () => {
    this.graph = this.state.view.graph;
    this.marker = this.createMarker();
    this.constraintHandler = new mxConstraintHandler(this.graph);

    // Clones the original points from the cell
    // and makes sure at least one point exists
    this.points = [];

    // Uses the absolute points of the state
    // for the initial configuration and preview
    this.abspoints = this.getSelectionPoints(this.state);
    this.shape = this.createSelectionShape(this.abspoints);
    this.shape.dialect = (this.graph.dialect !== mxConstants.DIALECT_SVG) ?
        mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
    this.shape.init(this.graph.getView().getOverlayPane());
    this.shape.pointerEvents = false;
    this.shape.setCursor(mxConstants.CURSOR_MOVABLE_EDGE);
    mxEvent.redirectMouseEvents(this.shape.node, this.graph, this.state);

    // Updates preferHtml
    this.preferHtml = this.state.text != null &&
        this.state.text.node.parentNode === this.graph.container;

    if (!this.preferHtml) {
      // Checks source terminal
      let sourceState = this.state.getVisibleTerminalState(true);

      if (sourceState != null) {
        this.preferHtml = sourceState.text != null &&
            sourceState.text.node.parentNode === this.graph.container;
      }

      if (!this.preferHtml) {
        // Checks target terminal
        let targetState = this.state.getVisibleTerminalState(false);

        if (targetState != null) {
          this.preferHtml = targetState.text != null &&
              targetState.text.node.parentNode === this.graph.container;
        }
      }
    }

    // Creates bends for the non-routed absolute points
    // or bends that don't correspond to points
    if (this.graph.getSelectionCount() < maxCells ||
        maxCells <= 0) {
      this.bends = this.createBends();

      if (this.isVirtualBendsEnabled()) {
        this.virtualBends = this.createVirtualBends();
      }
    }

    // Adds a rectangular handle for the label position
    this.label = new mxPoint(this.state.absoluteOffset.x, this.state.absoluteOffset.y);
    this.labelShape = this.createLabelHandleShape();
    this.initBend(this.labelShape);
    this.labelShape.setCursor(mxConstants.CURSOR_LABEL_HANDLE);

    this.customHandles = this.createCustomHandles();

    this.updateParentHighlight();
    this.redraw();
  };

  /**
   * Function: createCustomHandles
   *
   * Returns an array of custom handles. This implementation returns null.
   */
  createCustomHandles = () => {
    return null;
  };

  /**
   * Function: isVirtualBendsEnabled
   *
   * Returns true if virtual bends should be added. This returns true if
   * <virtualBendsEnabled> is true and the current style allows and
   * renders custom waypoints.
   */
  isVirtualBendsEnabled = (evt) => {
    return this.virtualBendsEnabled && (this.state.style[mxConstants.STYLE_EDGE] == null ||
        this.state.style[mxConstants.STYLE_EDGE] === mxConstants.NONE ||
        this.state.style[mxConstants.STYLE_NOEDGESTYLE] === 1) &&
        mxUtils.getValue(this.state.style, mxConstants.STYLE_SHAPE, null) !== 'arrow';
  };

  /**
   * Function: isCellEnabled
   *
   * Returns true if the given cell allows new connections to be created. This implementation
   * always returns true.
   */
  isCellEnabled = (cell) => {
    return true;
  };

  /**
   * Function: isAddPointEvent
   *
   * Returns true if the given event is a trigger to add a new point. This
   * implementation returns true if shift is pressed.
   */
  isAddPointEvent = (evt) => {
    return mxEvent.isShiftDown(evt);
  };

  /**
   * Function: isRemovePointEvent
   *
   * Returns true if the given event is a trigger to remove a point. This
   * implementation returns true if shift is pressed.
   */
  isRemovePointEvent = (evt) => {
    return mxEvent.isShiftDown(evt);
  };

  /**
   * Function: getSelectionPoints
   *
   * Returns the list of points that defines the selection stroke.
   */
  getSelectionPoints = (state) => {
    return state.absolutePoints;
  };

  /**
   * Function: createParentHighlightShape
   *
   * Creates the shape used to draw the selection border.
   */
  createParentHighlightShape = (bounds) => {
    let shape = new mxRectangleShape(mxRectangle.fromRectangle(bounds),
        null, this.getSelectionColor());
    shape.strokewidth = this.getSelectionStrokeWidth();
    shape.isDashed = this.isSelectionDashed();

    return shape;
  };

  /**
   * Function: createSelectionShape
   *
   * Creates the shape used to draw the selection border.
   */
  createSelectionShape = (points) => {
    let shape = new this.state.shape.constructor();
    shape.outline = true;
    shape.apply(this.state);

    shape.isDashed = this.isSelectionDashed();
    shape.stroke = this.getSelectionColor();
    shape.isShadow = false;

    return shape;
  };

  /**
   * Function: getSelectionColor
   *
   * Returns <mxConstants.EDGE_SELECTION_COLOR>.
   */
  getSelectionColor = () => {
    return mxConstants.EDGE_SELECTION_COLOR;
  };

  /**
   * Function: getSelectionStrokeWidth
   *
   * Returns <mxConstants.EDGE_SELECTION_STROKEWIDTH>.
   */
  getSelectionStrokeWidth = () => {
    return mxConstants.EDGE_SELECTION_STROKEWIDTH;
  };

  /**
   * Function: isSelectionDashed
   *
   * Returns <mxConstants.EDGE_SELECTION_DASHED>.
   */
  isSelectionDashed = () => {
    return mxConstants.EDGE_SELECTION_DASHED;
  };

  /**
   * Function: isConnectableCell
   *
   * Returns true if the given cell is connectable. This is a hook to
   * disable floating connections. This implementation returns true.
   */
  isConnectableCell = (cell) => {
    return true;
  };

  /**
   * Function: getCellAt
   *
   * Creates and returns the <mxCellMarker> used in <marker>.
   */
  getCellAt = (x, y) => {
    return (!this.outlineConnect) ? this.graph.getCellAt(x, y) : null;
  };

  /**
   * Function: createMarker
   *
   * Creates and returns the <mxCellMarker> used in <marker>.
   */
  createMarker = () => {
    let self = this; // closure

    class MyMarker extends mxCellMarker {
      // Only returns edges if they are connectable and never returns
      // the edge that is currently being modified
      getCell = (me) => {
        let cell = super.getCell(me);

        // Checks for cell at preview point (with grid)
        if ((cell === self.state.cell || cell == null) && self.currentPoint != null) {
          cell = self.graph.getCellAt(self.currentPoint.x, self.currentPoint.y);
        }

        // Uses connectable parent vertex if one exists
        if (cell != null && !this.graph.isCellConnectable(cell)) {
          let parent = this.graph.getModel().getParent(cell);

          if (this.graph.getModel().isVertex(parent) && this.graph.isCellConnectable(parent)) {
            cell = parent;
          }
        }

        let model = self.graph.getModel();

        if ((this.graph.isSwimlane(cell) && self.currentPoint != null &&
            this.graph.hitsSwimlaneContent(cell, self.currentPoint.x, self.currentPoint.y)) ||
            (!self.isConnectableCell(cell)) || (cell === self.state.cell ||
                (cell != null && !self.graph.connectableEdges && model.isEdge(cell))) ||
            model.isAncestor(self.state.cell, cell)) {
          cell = null;
        }

        if (!this.graph.isCellConnectable(cell)) {
          cell = null;
        }
        return cell;
      };

      // Sets the highlight color according to validateConnection
      isValidState = (state) => {
        let model = self.graph.getModel();
        let other = self.graph.view.getTerminalPort(state,
            self.graph.view.getState(model.getTerminal(self.state.cell,
                !self.isSource)), !self.isSource);
        let otherCell = (other != null) ? other.cell : null;
        let source = (self.isSource) ? state.cell : otherCell;
        let target = (self.isSource) ? otherCell : state.cell;

        // Updates the error message of the handler
        self.error = self.validateConnection(source, target);

        return self.error == null;
      };
    }

    return new MyMarker(this.graph);
  };

  /**
   * Function: validateConnection
   *
   * Returns the error message or an empty string if the connection for the
   * given source, target pair is not valid. Otherwise it returns null. This
   * implementation uses <mxGraph.getEdgeValidationError>.
   *
   * Parameters:
   *
   * source - <mxCell> that represents the source terminal.
   * target - <mxCell> that represents the target terminal.
   */
  validateConnection = (source, target) => {
    return this.graph.getEdgeValidationError(this.state.cell, source, target);
  };

  /**
   * Function: createBends
   *
   * Creates and returns the bends used for modifying the edge. This is
   * typically an array of <mxRectangleShapes>.
   */
  createBends = () => {
    let cell = this.state.cell;
    let bends = [];

    for (let i = 0; i < this.abspoints.length; i++) {
      if (this.isHandleVisible(i)) {
        let source = i === 0;
        let target = i === this.abspoints.length - 1;
        let terminal = source || target;

        if (terminal || this.graph.isCellBendable(cell)) {
          ((index) => {
            let bend = this.createHandleShape(index);
            this.initBend(bend, () => {
              if (this.dblClickRemoveEnabled) {
                this.removePoint(this.state, index);
              }
            });

            if (this.isHandleEnabled(i)) {
              bend.setCursor((terminal) ? mxConstants.CURSOR_TERMINAL_HANDLE : mxConstants.CURSOR_BEND_HANDLE);
            }

            bends.push(bend);

            if (!terminal) {
              this.points.push(new mxPoint(0, 0));
              bend.node.style.visibility = 'hidden';
            }
          })(i);
        }
      }
    }

    return bends;
  };

  /**
   * Function: createVirtualBends
   *
   * Creates and returns the bends used for modifying the edge. This is
   * typically an array of <mxRectangleShapes>.
   */
  createVirtualBends = () => {
    let cell = this.state.cell;
    let last = this.abspoints[0];
    let bends = [];

    if (this.graph.isCellBendable(cell)) {
      for (let i = 1; i < this.abspoints.length; i++) {
        (mxUtils.bind(this, (bend) => {
          this.initBend(bend);
          bend.setCursor(mxConstants.CURSOR_VIRTUAL_BEND_HANDLE);
          bends.push(bend);
        }))(this.createHandleShape());
      }
    }

    return bends;
  };

  /**
   * Function: isHandleEnabled
   *
   * Creates the shape used to display the given bend.
   */
  isHandleEnabled = (index) => {
    return true;
  };

  /**
   * Function: isHandleVisible
   *
   * Returns true if the handle at the given index is visible.
   */
  isHandleVisible = (index) => {
    let source = this.state.getVisibleTerminalState(true);
    let target = this.state.getVisibleTerminalState(false);
    let geo = this.graph.getCellGeometry(this.state.cell);
    let edgeStyle = (geo != null) ? this.graph.view.getEdgeStyle(this.state, geo.points, source, target) : null;

    return edgeStyle !== mxEdgeStyle.EntityRelation || index === 0 || index === this.abspoints.length - 1;
  };

  /**
   * Function: createHandleShape
   *
   * Creates the shape used to display the given bend. Note that the index may be
   * null for special cases, such as when called from
   * <mxElbowEdgeHandler.createVirtualBend>. Only images and rectangles should be
   * returned if support for HTML labels with not foreign objects is required.
   * Index if null for virtual handles.
   */
  createHandleShape = (index) => {
    if (this.handleImage != null) {
      let shape = new mxImageShape(new mxRectangle(0, 0, this.handleImage.width, this.handleImage.height), this.handleImage.src);

      // Allows HTML rendering of the images
      shape.preserveImageAspect = false;

      return shape;
    } else {
      let s = mxConstants.HANDLE_SIZE;

      if (this.preferHtml) {
        s -= 1;
      }

      return new mxRectangleShape(new mxRectangle(0, 0, s, s), mxConstants.HANDLE_FILLCOLOR, mxConstants.HANDLE_STROKECOLOR);
    }
  };

  /**
   * Function: createLabelHandleShape
   *
   * Creates the shape used to display the the label handle.
   */
  createLabelHandleShape = () => {
    if (this.labelHandleImage != null) {
      let shape = new mxImageShape(new mxRectangle(0, 0, this.labelHandleImage.width, this.labelHandleImage.height), this.labelHandleImage.src);

      // Allows HTML rendering of the images
      shape.preserveImageAspect = false;

      return shape;
    } else {
      let s = mxConstants.LABEL_HANDLE_SIZE;
      return new mxRectangleShape(new mxRectangle(0, 0, s, s), mxConstants.LABEL_HANDLE_FILLCOLOR, mxConstants.HANDLE_STROKECOLOR);
    }
  };

  /**
   * Function: initBend
   *
   * Helper method to initialize the given bend.
   *
   * Parameters:
   *
   * bend - <mxShape> that represents the bend to be initialized.
   */
  initBend = (bend, dblClick) => {
    if (this.preferHtml) {
      bend.dialect = mxConstants.DIALECT_STRICTHTML;
      bend.init(this.graph.container);
    } else {
      bend.dialect = (this.graph.dialect !== mxConstants.DIALECT_SVG) ?
          mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
      bend.init(this.graph.getView().getOverlayPane());
    }

    mxEvent.redirectMouseEvents(bend.node, this.graph, this.state,
        null, null, null, dblClick);

    if (mxClient.IS_TOUCH) {
      bend.node.setAttribute('pointer-events', 'none');
    }
  };

  /**
   * Function: getHandleForEvent
   *
   * Returns the index of the handle for the given event.
   */
  getHandleForEvent = (me) => {
    let result = null;

    if (this.state != null) {
      // Connection highlight may consume events before they reach sizer handle
      let tol = (!mxEvent.isMouseEvent(me.getEvent())) ? this.tolerance : 1;
      let hit = (this.allowHandleBoundsCheck && tol > 0) ?
          new mxRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol) : null;
      let minDistSq = null;

      function checkShape(shape) {
        if (shape != null && shape.node != null && shape.node.style.display != 'none' &&
            shape.node.style.visibility != 'hidden' &&
            (me.isSource(shape) || (hit != null && mxUtils.intersects(shape.bounds, hit)))) {
          let dx = me.getGraphX() - shape.bounds.getCenterX();
          let dy = me.getGraphY() - shape.bounds.getCenterY();
          let tmp = dx * dx + dy * dy;

          if (minDistSq == null || tmp <= minDistSq) {
            minDistSq = tmp;

            return true;
          }
        }

        return false;
      }

      if (this.customHandles != null && this.isCustomHandleEvent(me)) {
        // Inverse loop order to match display order
        for (let i = this.customHandles.length - 1; i >= 0; i--) {
          if (checkShape(this.customHandles[i].shape)) {
            // LATER: Return reference to active shape
            return mxEvent.CUSTOM_HANDLE - i;
          }
        }
      }

      if (me.isSource(this.state.text) || checkShape(this.labelShape)) {
        result = mxEvent.LABEL_HANDLE;
      }

      if (this.bends != null) {
        for (let i = 0; i < this.bends.length; i++) {
          if (checkShape(this.bends[i])) {
            result = i;
          }
        }
      }

      if (this.virtualBends != null && this.isAddVirtualBendEvent(me)) {
        for (let i = 0; i < this.virtualBends.length; i++) {
          if (checkShape(this.virtualBends[i])) {
            result = mxEvent.VIRTUAL_HANDLE - i;
          }
        }
      }
    }

    return result;
  };

  /**
   * Function: isAddVirtualBendEvent
   *
   * Returns true if the given event allows virtual bends to be added. This
   * implementation returns true.
   */
  isAddVirtualBendEvent = (me) => {
    return true;
  };

  /**
   * Function: isCustomHandleEvent
   *
   * Returns true if the given event allows custom handles to be changed. This
   * implementation returns true.
   */
  isCustomHandleEvent = (me) => {
    return true;
  };

  /**
   * Function: mouseDown
   *
   * Handles the event by checking if a special element of the handler
   * was clicked, in which case the index parameter is non-null. The
   * indices may be one of <LABEL_HANDLE> or the number of the respective
   * control point. The source and target points are used for reconnecting
   * the edge.
   */
  mouseDown = (sender, me) => {
    let handle = this.getHandleForEvent(me);

    if (this.bends != null && this.bends[handle] != null) {
      let b = this.bends[handle].bounds;
      this.snapPoint = new mxPoint(b.getCenterX(), b.getCenterY());
    }

    if (this.addEnabled && handle == null && this.isAddPointEvent(me.getEvent())) {
      this.addPoint(this.state, me.getEvent());
      me.consume();
    } else if (handle != null && !me.isConsumed() && this.graph.isEnabled()) {
      if (this.removeEnabled && this.isRemovePointEvent(me.getEvent())) {
        this.removePoint(this.state, handle);
      } else if (handle != mxEvent.LABEL_HANDLE || this.graph.isLabelMovable(me.getCell())) {
        if (handle <= mxEvent.VIRTUAL_HANDLE) {
          mxUtils.setOpacity(this.virtualBends[mxEvent.VIRTUAL_HANDLE - handle].node, 100);
        }

        this.start(me.getX(), me.getY(), handle);
      }

      me.consume();
    }
  };

  /**
   * Function: start
   *
   * Starts the handling of the mouse gesture.
   */
  start = (x, y, index) => {
    this.startX = x;
    this.startY = y;

    this.isSource = (this.bends == null) ? false : index == 0;
    this.isTarget = (this.bends == null) ? false : index == this.bends.length - 1;
    this.isLabel = index == mxEvent.LABEL_HANDLE;

    if (this.isSource || this.isTarget) {
      let cell = this.state.cell;
      let terminal = this.graph.model.getTerminal(cell, this.isSource);

      if ((terminal == null && this.graph.isTerminalPointMovable(cell, this.isSource)) ||
          (terminal != null && this.graph.isCellDisconnectable(cell, terminal, this.isSource))) {
        this.index = index;
      }
    } else {
      this.index = index;
    }

    // Hides other custom handles
    if (this.index <= mxEvent.CUSTOM_HANDLE && this.index > mxEvent.VIRTUAL_HANDLE) {
      if (this.customHandles != null) {
        for (let i = 0; i < this.customHandles.length; i++) {
          if (i !== mxEvent.CUSTOM_HANDLE - this.index) {
            this.customHandles[i].setVisible(false);
          }
        }
      }
    }
  };

  /**
   * Function: clonePreviewState
   *
   * Returns a clone of the current preview state for the given point and terminal.
   */
  clonePreviewState = (point, terminal) => {
    return this.state.clone();
  };

  /**
   * Function: getSnapToTerminalTolerance
   *
   * Returns the tolerance for the guides. Default value is
   * gridSize * scale / 2.
   */
  getSnapToTerminalTolerance = () => {
    return this.graph.gridSize * this.graph.view.scale / 2;
  };

  /**
   * Function: updateHint
   *
   * Hook for subclassers do show details while the handler is active.
   */
  updateHint = (me, point) => {
  };

  /**
   * Function: removeHint
   *
   * Hooks for subclassers to hide details when the handler gets inactive.
   */
  removeHint = () => {
  };

  /**
   * Function: roundLength
   *
   * Hook for rounding the unscaled width or height. This uses Math.round.
   */
  roundLength = (length) => {
    return Math.round(length);
  };

  /**
   * Function: isSnapToTerminalsEvent
   *
   * Returns true if <snapToTerminals> is true and if alt is not pressed.
   */
  isSnapToTerminalsEvent = (me) => {
    return this.snapToTerminals && !mxEvent.isAltDown(me.getEvent());
  };

  /**
   * Function: getPointForEvent
   *
   * Returns the point for the given event.
   */
  getPointForEvent = (me) => {
    let view = this.graph.getView();
    let scale = view.scale;
    let point = new mxPoint(this.roundLength(me.getGraphX() / scale) * scale,
        this.roundLength(me.getGraphY() / scale) * scale);

    let tt = this.getSnapToTerminalTolerance();
    let overrideX = false;
    let overrideY = false;

    if (tt > 0 && this.isSnapToTerminalsEvent(me)) {
      function snapToPoint(pt) {
        if (pt != null) {
          let x = pt.x;

          if (Math.abs(point.x - x) < tt) {
            point.x = x;
            overrideX = true;
          }

          let y = pt.y;

          if (Math.abs(point.y - y) < tt) {
            point.y = y;
            overrideY = true;
          }
        }
      }

      // Temporary function
      function snapToTerminal(terminal) {
        if (terminal != null) {
          snapToPoint.call(this, new mxPoint(view.getRoutingCenterX(terminal),
              view.getRoutingCenterY(terminal)));
        }
      }

      snapToTerminal.call(this, this.state.getVisibleTerminalState(true));
      snapToTerminal.call(this, this.state.getVisibleTerminalState(false));

      if (this.state.absolutePoints != null) {
        for (let i = 0; i < this.state.absolutePoints.length; i++) {
          snapToPoint.call(this, this.state.absolutePoints[i]);
        }
      }
    }

    if (this.graph.isGridEnabledEvent(me.getEvent())) {
      let tr = view.translate;

      if (!overrideX) {
        point.x = (this.graph.snap(point.x / scale - tr.x) + tr.x) * scale;
      }

      if (!overrideY) {
        point.y = (this.graph.snap(point.y / scale - tr.y) + tr.y) * scale;
      }
    }

    return point;
  };

  /**
   * Function: getPreviewTerminalState
   *
   * Updates the given preview state taking into account the state of the constraint handler.
   */
  getPreviewTerminalState = (me) => {
    this.constraintHandler.update(me, this.isSource, true, me.isSource(this.marker.highlight.shape) ? null : this.currentPoint);

    if (this.constraintHandler.currentFocus != null && this.constraintHandler.currentConstraint != null) {
      // Handles special case where grid is large and connection point is at actual point in which
      // case the outline is not followed as long as we're < gridSize / 2 away from that point
      if (this.marker.highlight != null && this.marker.highlight.state != null &&
          this.marker.highlight.state.cell === this.constraintHandler.currentFocus.cell) {
        // Direct repaint needed if cell already highlighted
        if (this.marker.highlight.shape.stroke !== 'transparent') {
          this.marker.highlight.shape.stroke = 'transparent';
          this.marker.highlight.repaint();
        }
      } else {
        this.marker.markCell(this.constraintHandler.currentFocus.cell, 'transparent');
      }

      let model = this.graph.getModel();
      let other = this.graph.view.getTerminalPort(this.state,
          this.graph.view.getState(model.getTerminal(this.state.cell,
              !this.isSource)), !this.isSource);
      let otherCell = (other != null) ? other.cell : null;
      let source = (this.isSource) ? this.constraintHandler.currentFocus.cell : otherCell;
      let target = (this.isSource) ? otherCell : this.constraintHandler.currentFocus.cell;

      // Updates the error message of the handler
      this.error = this.validateConnection(source, target);
      let result = null;

      if (this.error == null) {
        result = this.constraintHandler.currentFocus;
      }

      if (this.error != null || (result != null &&
          !this.isCellEnabled(result.cell))) {
        this.constraintHandler.reset();
      }

      return result;
    } else if (!this.graph.isIgnoreTerminalEvent(me.getEvent())) {
      this.marker.process(me);
      let state = this.marker.getValidState();

      if (state != null && !this.isCellEnabled(state.cell)) {
        this.constraintHandler.reset();
        this.marker.reset();
      }

      return this.marker.getValidState();
    } else {
      this.marker.reset();

      return null;
    }
  };

  /**
   * Function: getPreviewPoints
   *
   * Updates the given preview state taking into account the state of the constraint handler.
   *
   * Parameters:
   *
   * pt - <mxPoint> that contains the current pointer position.
   * me - Optional <mxMouseEvent> that contains the current event.
   */
  getPreviewPoints = (pt, me) => {
    let geometry = this.graph.getCellGeometry(this.state.cell);
    let points = (geometry.points != null) ? geometry.points.slice() : null;
    let point = new mxPoint(pt.x, pt.y);
    let result = null;

    if (!this.isSource && !this.isTarget) {
      this.convertPoint(point, false);

      if (points == null) {
        points = [point];
      } else {
        // Adds point from virtual bend
        if (this.index <= mxEvent.VIRTUAL_HANDLE) {
          points.splice(mxEvent.VIRTUAL_HANDLE - this.index, 0, point);
        }

        // Removes point if dragged on terminal point
        if (!this.isSource && !this.isTarget) {
          for (let i = 0; i < this.bends.length; i++) {
            if (i != this.index) {
              let bend = this.bends[i];

              if (bend != null && mxUtils.contains(bend.bounds, pt.x, pt.y)) {
                if (this.index <= mxEvent.VIRTUAL_HANDLE) {
                  points.splice(mxEvent.VIRTUAL_HANDLE - this.index, 1);
                } else {
                  points.splice(this.index - 1, 1);
                }

                result = points;
              }
            }
          }

          // Removes point if user tries to straighten a segment
          if (result == null && this.straightRemoveEnabled && (me == null || !mxEvent.isAltDown(me.getEvent()))) {
            let tol = this.graph.tolerance * this.graph.tolerance;
            let abs = this.state.absolutePoints.slice();
            abs[this.index] = pt;

            // Handes special case where removing waypoint affects tolerance (flickering)
            let src = this.state.getVisibleTerminalState(true);

            if (src != null) {
              let c = this.graph.getConnectionConstraint(this.state, src, true);

              // Checks if point is not fixed
              if (c == null || this.graph.getConnectionPoint(src, c) == null) {
                abs[0] = new mxPoint(src.view.getRoutingCenterX(src), src.view.getRoutingCenterY(src));
              }
            }

            let trg = this.state.getVisibleTerminalState(false);

            if (trg != null) {
              let c = this.graph.getConnectionConstraint(this.state, trg, false);

              // Checks if point is not fixed
              if (c == null || this.graph.getConnectionPoint(trg, c) == null) {
                abs[abs.length - 1] = new mxPoint(trg.view.getRoutingCenterX(trg), trg.view.getRoutingCenterY(trg));
              }
            }

            function checkRemove(idx, tmp) {
              if (idx > 0 && idx < abs.length - 1 &&
                  mxUtils.ptSegDistSq(abs[idx - 1].x, abs[idx - 1].y,
                      abs[idx + 1].x, abs[idx + 1].y, tmp.x, tmp.y) < tol) {
                points.splice(idx - 1, 1);
                result = points;
              }
            }

            // LATER: Check if other points can be removed if a segment is made straight
            checkRemove(this.index, pt);
          }
        }

        // Updates existing point
        if (result == null && this.index > mxEvent.VIRTUAL_HANDLE) {
          points[this.index - 1] = point;
        }
      }
    } else if (this.graph.resetEdgesOnConnect) {
      points = null;
    }

    return (result != null) ? result : points;
  };

  /**
   * Function: isOutlineConnectEvent
   *
   * Returns true if <outlineConnect> is true and the source of the event is the outline shape
   * or shift is pressed.
   */
  isOutlineConnectEvent = (me) => {
    let offset = mxUtils.getOffset(this.graph.container);
    let evt = me.getEvent();

    let clientX = mxEvent.getClientX(evt);
    let clientY = mxEvent.getClientY(evt);

    let doc = document.documentElement;
    let left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    let top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);

    let gridX = this.currentPoint.x - this.graph.container.scrollLeft + offset.x - left;
    let gridY = this.currentPoint.y - this.graph.container.scrollTop + offset.y - top;

    return this.outlineConnect && !mxEvent.isShiftDown(me.getEvent()) &&
        (me.isSource(this.marker.highlight.shape) ||
            (mxEvent.isAltDown(me.getEvent()) && me.getState() != null) ||
            this.marker.highlight.isHighlightAt(clientX, clientY) ||
            ((gridX !== clientX || gridY !== clientY) && me.getState() == null &&
                this.marker.highlight.isHighlightAt(gridX, gridY)));
  };

  /**
   * Function: updatePreviewState
   *
   * Updates the given preview state taking into account the state of the constraint handler.
   */
  updatePreviewState = (edge, point, terminalState, me, outline) => {
    // Computes the points for the edge style and terminals
    let sourceState = (this.isSource) ? terminalState : this.state.getVisibleTerminalState(true);
    let targetState = (this.isTarget) ? terminalState : this.state.getVisibleTerminalState(false);

    let sourceConstraint = this.graph.getConnectionConstraint(edge, sourceState, true);
    let targetConstraint = this.graph.getConnectionConstraint(edge, targetState, false);

    let constraint = this.constraintHandler.currentConstraint;

    if (constraint == null && outline) {
      if (terminalState != null) {
        // Handles special case where mouse is on outline away from actual end point
        // in which case the grid is ignored and mouse point is used instead
        if (me.isSource(this.marker.highlight.shape)) {
          point = new mxPoint(me.getGraphX(), me.getGraphY());
        }

        constraint = this.graph.getOutlineConstraint(point, terminalState, me);
        this.constraintHandler.setFocus(me, terminalState, this.isSource);
        this.constraintHandler.currentConstraint = constraint;
        this.constraintHandler.currentPoint = point;
      } else {
        constraint = new mxConnectionConstraint();
      }
    }

    if (this.outlineConnect && this.marker.highlight != null && this.marker.highlight.shape != null) {
      let s = this.graph.view.scale;

      if (this.constraintHandler.currentConstraint != null &&
          this.constraintHandler.currentFocus != null) {
        this.marker.highlight.shape.stroke = (outline) ? mxConstants.OUTLINE_HIGHLIGHT_COLOR : 'transparent';
        this.marker.highlight.shape.strokewidth = mxConstants.OUTLINE_HIGHLIGHT_STROKEWIDTH / s / s;
        this.marker.highlight.repaint();
      } else if (this.marker.hasValidState()) {
        this.marker.highlight.shape.stroke = (this.graph.isCellConnectable(me.getCell()) &&
            this.marker.getValidState() !== me.getState()) ?
            'transparent' : mxConstants.DEFAULT_VALID_COLOR;
        this.marker.highlight.shape.strokewidth = mxConstants.HIGHLIGHT_STROKEWIDTH / s / s;
        this.marker.highlight.repaint();
      }
    }

    if (this.isSource) {
      sourceConstraint = constraint;
    } else if (this.isTarget) {
      targetConstraint = constraint;
    }

    if (this.isSource || this.isTarget) {
      if (constraint != null && constraint.point != null) {
        edge.style[(this.isSource) ? mxConstants.STYLE_EXIT_X : mxConstants.STYLE_ENTRY_X] = constraint.point.x;
        edge.style[(this.isSource) ? mxConstants.STYLE_EXIT_Y : mxConstants.STYLE_ENTRY_Y] = constraint.point.y;
      } else {
        delete edge.style[(this.isSource) ? mxConstants.STYLE_EXIT_X : mxConstants.STYLE_ENTRY_X];
        delete edge.style[(this.isSource) ? mxConstants.STYLE_EXIT_Y : mxConstants.STYLE_ENTRY_Y];
      }
    }

    edge.setVisibleTerminalState(sourceState, true);
    edge.setVisibleTerminalState(targetState, false);

    if (!this.isSource || sourceState != null) {
      edge.view.updateFixedTerminalPoint(edge, sourceState, true, sourceConstraint);
    }

    if (!this.isTarget || targetState != null) {
      edge.view.updateFixedTerminalPoint(edge, targetState, false, targetConstraint);
    }

    if ((this.isSource || this.isTarget) && terminalState == null) {
      edge.setAbsoluteTerminalPoint(point, this.isSource);

      if (this.marker.getMarkedState() == null) {
        this.error = (this.graph.allowDanglingEdges) ? null : '';
      }
    }

    edge.view.updatePoints(edge, this.points, sourceState, targetState);
    edge.view.updateFloatingTerminalPoints(edge, sourceState, targetState);
  };

  /**
   * Function: mouseMove
   *
   * Handles the event by updating the preview.
   */
  mouseMove = (sender, me) => {
    if (this.index != null && this.marker != null) {
      this.currentPoint = this.getPointForEvent(me);
      this.error = null;

      // Uses the current point from the constraint handler if available
      if (!this.graph.isIgnoreTerminalEvent(me.getEvent()) && mxEvent.isShiftDown(me.getEvent()) && this.snapPoint != null) {
        if (Math.abs(this.snapPoint.x - this.currentPoint.x) < Math.abs(this.snapPoint.y - this.currentPoint.y)) {
          this.currentPoint.x = this.snapPoint.x;
        } else {
          this.currentPoint.y = this.snapPoint.y;
        }
      }

      if (this.index <= mxEvent.CUSTOM_HANDLE && this.index > mxEvent.VIRTUAL_HANDLE) {
        if (this.customHandles != null) {
          this.customHandles[mxEvent.CUSTOM_HANDLE - this.index].processEvent(me);
          this.customHandles[mxEvent.CUSTOM_HANDLE - this.index].positionChanged();

          if (this.shape != null && this.shape.node != null) {
            this.shape.node.style.display = 'none';
          }
        }
      } else if (this.isLabel) {
        this.label.x = this.currentPoint.x;
        this.label.y = this.currentPoint.y;
      } else {
        this.points = this.getPreviewPoints(this.currentPoint, me);
        let terminalState = (this.isSource || this.isTarget) ? this.getPreviewTerminalState(me) : null;

        if (this.constraintHandler.currentConstraint != null &&
            this.constraintHandler.currentFocus != null &&
            this.constraintHandler.currentPoint != null) {
          this.currentPoint = this.constraintHandler.currentPoint.clone();
        } else if (this.outlineConnect) {
          // Need to check outline before cloning terminal state
          let outline = (this.isSource || this.isTarget) ? this.isOutlineConnectEvent(me) : false

          if (outline) {
            terminalState = this.marker.highlight.state;
          } else if (terminalState != null && terminalState != me.getState() &&
              this.graph.isCellConnectable(me.getCell()) &&
              this.marker.highlight.shape != null) {
            this.marker.highlight.shape.stroke = 'transparent';
            this.marker.highlight.repaint();
            terminalState = null;
          }
        }

        if (terminalState != null && !this.isCellEnabled(terminalState.cell)) {
          terminalState = null;
          this.marker.reset();
        }

        let clone = this.clonePreviewState(this.currentPoint, (terminalState != null) ? terminalState.cell : null);
        this.updatePreviewState(clone, this.currentPoint, terminalState, me, outline);

        // Sets the color of the preview to valid or invalid, updates the
        // points of the preview and redraws
        let color = (this.error == null) ? this.marker.validColor : this.marker.invalidColor;
        this.setPreviewColor(color);
        this.abspoints = clone.absolutePoints;
        this.active = true;
        this.updateHint(me, this.currentPoint);
      }

      // This should go before calling isOutlineConnectEvent above. As a workaround
      // we add an offset of gridSize to the hint to avoid problem with hit detection
      // in highlight.isHighlightAt (which uses comonentFromPoint)
      this.drawPreview();
      mxEvent.consume(me.getEvent());
      me.consume();
    }
  };

  /**
   * Function: mouseUp
   *
   * Handles the event to applying the previewed changes on the edge by
   * using <moveLabel>, <connect> or <changePoints>.
   */
  mouseUp = (sender, me) => {
    // Workaround for wrong event source in Webkit
    if (this.index != null && this.marker != null) {
      if (this.shape != null && this.shape.node != null) {
        this.shape.node.style.display = '';
      }

      let edge = this.state.cell;
      let index = this.index;
      this.index = null;

      // Ignores event if mouse has not been moved
      if (me.getX() !== this.startX || me.getY() !== this.startY) {
        let clone = !this.graph.isIgnoreTerminalEvent(me.getEvent()) && this.graph.isCloneEvent(me.getEvent()) &&
            this.cloneEnabled && this.graph.isCellsCloneable();

        // Displays the reason for not carriying out the change
        // if there is an error message with non-zero length
        if (this.error != null) {
          if (this.error.length > 0) {
            this.graph.validationAlert(this.error);
          }
        } else if (index <= mxEvent.CUSTOM_HANDLE && index > mxEvent.VIRTUAL_HANDLE) {
          if (this.customHandles != null) {
            let model = this.graph.getModel();

            model.beginUpdate();
            try {
              this.customHandles[mxEvent.CUSTOM_HANDLE - index].execute(me);

              if (this.shape != null && this.shape.node != null) {
                this.shape.apply(this.state);
                this.shape.redraw();
              }
            } finally {
              model.endUpdate();
            }
          }
        } else if (this.isLabel) {
          this.moveLabel(this.state, this.label.x, this.label.y);
        } else if (this.isSource || this.isTarget) {
          let terminal = null;

          if (this.constraintHandler.currentConstraint != null &&
              this.constraintHandler.currentFocus != null) {
            terminal = this.constraintHandler.currentFocus.cell;
          }

          if (terminal == null && this.marker.hasValidState() && this.marker.highlight != null &&
              this.marker.highlight.shape != null &&
              this.marker.highlight.shape.stroke !== 'transparent' &&
              this.marker.highlight.shape.stroke !== 'white') {
            terminal = this.marker.validState.cell;
          }

          if (terminal != null) {
            let model = this.graph.getModel();
            let parent = model.getParent(edge);

            model.beginUpdate();
            try {
              // Clones and adds the cell
              if (clone) {
                let geo = model.getGeometry(edge);
                let clone = this.graph.cloneCell(edge);
                model.add(parent, clone, model.getChildCount(parent));

                if (geo != null) {
                  geo = geo.clone();
                  model.setGeometry(clone, geo);
                }

                let other = model.getTerminal(edge, !this.isSource);
                this.graph.connectCell(clone, other, !this.isSource);

                edge = clone;
              }

              edge = this.connect(edge, terminal, this.isSource, clone, me);
            } finally {
              model.endUpdate();
            }
          } else if (this.graph.isAllowDanglingEdges()) {
            let pt = this.abspoints[(this.isSource) ? 0 : this.abspoints.length - 1];
            pt.x = this.roundLength(pt.x / this.graph.view.scale - this.graph.view.translate.x);
            pt.y = this.roundLength(pt.y / this.graph.view.scale - this.graph.view.translate.y);

            let pstate = this.graph.getView().getState(
                this.graph.getModel().getParent(edge));

            if (pstate != null) {
              pt.x -= pstate.origin.x;
              pt.y -= pstate.origin.y;
            }

            pt.x -= this.graph.panDx / this.graph.view.scale;
            pt.y -= this.graph.panDy / this.graph.view.scale;

            // Destroys and recreates this handler
            edge = this.changeTerminalPoint(edge, pt, this.isSource, clone);
          }
        } else if (this.active) {
          edge = this.changePoints(edge, this.points, clone);
        } else {
          this.graph.getView().invalidate(this.state.cell);
          this.graph.getView().validate(this.state.cell);
        }
      } else if (this.graph.isToggleEvent(me.getEvent())) {
        this.graph.selectCellForEvent(this.state.cell, me.getEvent());
      }

      // Resets the preview color the state of the handler if this
      // handler has not been recreated
      if (this.marker != null) {
        this.reset();

        // Updates the selection if the edge has been cloned
        if (edge !== this.state.cell) {
          this.graph.setSelectionCell(edge);
        }
      }

      me.consume();
    }
  };

  /**
   * Function: reset
   *
   * Resets the state of this handler.
   */
  reset = () => {
    if (this.active) {
      this.refresh();
    }

    this.error = null;
    this.index = null;
    this.label = null;
    this.points = null;
    this.snapPoint = null;
    this.isLabel = false;
    this.isSource = false;
    this.isTarget = false;
    this.active = false;

    if (this.livePreview && this.sizers != null) {
      for (let i = 0; i < this.sizers.length; i++) {
        if (this.sizers[i] != null) {
          this.sizers[i].node.style.display = '';
        }
      }
    }

    if (this.marker != null) {
      this.marker.reset();
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.reset();
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].reset();
      }
    }

    this.setPreviewColor(mxConstants.EDGE_SELECTION_COLOR);
    this.removeHint();
    this.redraw();
  };

  /**
   * Function: setPreviewColor
   *
   * Sets the color of the preview to the given value.
   */
  setPreviewColor = (color) => {
    if (this.shape != null) {
      this.shape.stroke = color;
    }
  };


  /**
   * Function: convertPoint
   *
   * Converts the given point in-place from screen to unscaled, untranslated
   * graph coordinates and applies the grid. Returns the given, modified
   * point instance.
   *
   * Parameters:
   *
   * point - <mxPoint> to be converted.
   * gridEnabled - Boolean that specifies if the grid should be applied.
   */
  convertPoint = (point, gridEnabled) => {
    let scale = this.graph.getView().getScale();
    let tr = this.graph.getView().getTranslate();

    if (gridEnabled) {
      point.x = this.graph.snap(point.x);
      point.y = this.graph.snap(point.y);
    }

    point.x = Math.round(point.x / scale - tr.x);
    point.y = Math.round(point.y / scale - tr.y);

    let pstate = this.graph.getView().getState(
        this.graph.getModel().getParent(this.state.cell));

    if (pstate != null) {
      point.x -= pstate.origin.x;
      point.y -= pstate.origin.y;
    }

    return point;
  };

  /**
   * Function: moveLabel
   *
   * Changes the coordinates for the label of the given edge.
   *
   * Parameters:
   *
   * edge - <mxCell> that represents the edge.
   * x - Integer that specifies the x-coordinate of the new location.
   * y - Integer that specifies the y-coordinate of the new location.
   */
  moveLabel = (edgeState, x, y) => {
    let model = this.graph.getModel();
    let geometry = model.getGeometry(edgeState.cell);

    if (geometry != null) {
      let scale = this.graph.getView().scale;
      geometry = geometry.clone();

      if (geometry.relative) {
        // Resets the relative location stored inside the geometry
        let pt = this.graph.getView().getRelativePoint(edgeState, x, y);
        geometry.x = Math.round(pt.x * 10000) / 10000;
        geometry.y = Math.round(pt.y);

        // Resets the offset inside the geometry to find the offset
        // from the resulting point
        geometry.offset = new mxPoint(0, 0);
        pt = this.graph.view.getPoint(edgeState, geometry);
        geometry.offset = new mxPoint(Math.round((x - pt.x) / scale), Math.round((y - pt.y) / scale));
      } else {
        let points = edgeState.absolutePoints;
        var p0 = points[0];
        let pe = points[points.length - 1];

        if (p0 != null && pe != null) {
          let cx = p0.x + (pe.x - p0.x) / 2;
          let cy = p0.y + (pe.y - p0.y) / 2;

          geometry.offset = new mxPoint(Math.round((x - cx) / scale), Math.round((y - cy) / scale));
          geometry.x = 0;
          geometry.y = 0;
        }
      }

      model.setGeometry(edgeState.cell, geometry);
    }
  };

  /**
   * Function: connect
   *
   * Changes the terminal or terminal point of the given edge in the graph
   * model.
   *
   * Parameters:
   *
   * edge - <mxCell> that represents the edge to be reconnected.
   * terminal - <mxCell> that represents the new terminal.
   * isSource - Boolean indicating if the new terminal is the source or
   * target terminal.
   * isClone - Boolean indicating if the new connection should be a clone of
   * the old edge.
   * me - <mxMouseEvent> that contains the mouse up event.
   */
  connect = (edge, terminal, isSource, isClone, me) => {
    let model = this.graph.getModel();
    let parent = model.getParent(edge);

    model.beginUpdate();
    try {
      let constraint = this.constraintHandler.currentConstraint;

      if (constraint == null) {
        constraint = new mxConnectionConstraint();
      }

      this.graph.connectCell(edge, terminal, isSource, constraint);
    } finally {
      model.endUpdate();
    }

    return edge;
  };

  /**
   * Function: changeTerminalPoint
   *
   * Changes the terminal point of the given edge.
   */
  changeTerminalPoint = (edge, point, isSource, clone) => {
    let model = this.graph.getModel();

    model.beginUpdate();
    try {
      if (clone) {
        let parent = model.getParent(edge);
        let terminal = model.getTerminal(edge, !isSource);
        edge = this.graph.cloneCell(edge);
        model.add(parent, edge, model.getChildCount(parent));
        model.setTerminal(edge, terminal, !isSource);
      }

      let geo = model.getGeometry(edge);

      if (geo != null) {
        geo = geo.clone();
        geo.setTerminalPoint(point, isSource);
        model.setGeometry(edge, geo);
        this.graph.connectCell(edge, null, isSource, new mxConnectionConstraint());
      }
    } finally {
      model.endUpdate();
    }

    return edge;
  };

  /**
   * Function: changePoints
   *
   * Changes the control points of the given edge in the graph model.
   */
  changePoints = (edge, points, clone) => {
    let model = this.graph.getModel();
    model.beginUpdate();
    try {
      if (clone) {
        let parent = model.getParent(edge);
        let source = model.getTerminal(edge, true);
        let target = model.getTerminal(edge, false);
        edge = this.graph.cloneCell(edge);
        model.add(parent, edge, model.getChildCount(parent));
        model.setTerminal(edge, source, true);
        model.setTerminal(edge, target, false);
      }

      let geo = model.getGeometry(edge);

      if (geo != null) {
        geo = geo.clone();
        geo.points = points;

        model.setGeometry(edge, geo);
      }
    } finally {
      model.endUpdate();
    }

    return edge;
  };

  /**
   * Function: addPoint
   *
   * Adds a control point for the given state and event.
   */
  addPoint = (state, evt) => {
    let pt = mxUtils.convertPoint(this.graph.container, mxEvent.getClientX(evt),
        mxEvent.getClientY(evt));
    let gridEnabled = this.graph.isGridEnabledEvent(evt);
    this.convertPoint(pt, gridEnabled);
    this.addPointAt(state, pt.x, pt.y);
    mxEvent.consume(evt);
  };

  /**
   * Function: addPointAt
   *
   * Adds a control point at the given point.
   */
  addPointAt = (state, x, y) => {
    let geo = this.graph.getCellGeometry(state.cell);
    let pt = new mxPoint(x, y);

    if (geo != null) {
      geo = geo.clone();
      let t = this.graph.view.translate;
      let s = this.graph.view.scale;
      let offset = new mxPoint(t.x * s, t.y * s);

      let parent = this.graph.model.getParent(this.state.cell);

      if (this.graph.model.isVertex(parent)) {
        let pState = this.graph.view.getState(parent);
        offset = new mxPoint(pState.x, pState.y);
      }

      let index = mxUtils.findNearestSegment(state, pt.x * s + offset.x, pt.y * s + offset.y);

      if (geo.points == null) {
        geo.points = [pt];
      } else {
        geo.points.splice(index, 0, pt);
      }

      this.graph.getModel().setGeometry(state.cell, geo);
      this.refresh();
      this.redraw();
    }
  };

  /**
   * Function: removePoint
   *
   * Removes the control point at the given index from the given state.
   */
  removePoint = (state, index) => {
    if (index > 0 && index < this.abspoints.length - 1) {
      let geo = this.graph.getCellGeometry(this.state.cell);

      if (geo != null && geo.points != null) {
        geo = geo.clone();
        geo.points.splice(index - 1, 1);
        this.graph.getModel().setGeometry(state.cell, geo);
        this.refresh();
        this.redraw();
      }
    }
  };

  /**
   * Function: getHandleFillColor
   *
   * Returns the fillcolor for the handle at the given index.
   */
  getHandleFillColor = (index) => {
    let isSource = index === 0;
    let cell = this.state.cell;
    let terminal = this.graph.getModel().getTerminal(cell, isSource);
    let color = mxConstants.HANDLE_FILLCOLOR;

    if ((terminal != null && !this.graph.isCellDisconnectable(cell, terminal, isSource)) ||
        (terminal == null && !this.graph.isTerminalPointMovable(cell, isSource))) {
      color = mxConstants.LOCKED_HANDLE_FILLCOLOR;
    } else if (terminal != null && this.graph.isCellDisconnectable(cell, terminal, isSource)) {
      color = mxConstants.CONNECT_HANDLE_FILLCOLOR;
    }

    return color;
  };

  /**
   * Function: redraw
   *
   * Redraws the preview, and the bends- and label control points.
   */
  redraw = (ignoreHandles) => {
    if (this.state != null) {
      this.abspoints = this.state.absolutePoints.slice();
      let g = this.graph.getModel().getGeometry(this.state.cell);

      if (g != null) {
        let pts = g.points;

        if (this.bends != null && this.bends.length > 0) {
          if (pts != null) {
            if (this.points == null) {
              this.points = [];
            }

            for (let i = 1; i < this.bends.length - 1; i++) {
              if (this.bends[i] != null && this.abspoints[i] != null) {
                this.points[i - 1] = pts[i - 1];
              }
            }
          }
        }
      }

      this.drawPreview();

      if (!ignoreHandles) {
        this.redrawHandles();
      }
    }
  };

  /**
   * Function: redrawHandles
   *
   * Redraws the handles.
   */
  redrawHandles = () => {
    let cell = this.state.cell;

    // Updates the handle for the label position
    let b = this.labelShape.bounds;
    this.label = new mxPoint(this.state.absoluteOffset.x, this.state.absoluteOffset.y);
    this.labelShape.bounds = new mxRectangle(Math.round(this.label.x - b.width / 2),
        Math.round(this.label.y - b.height / 2), b.width, b.height);

    // Shows or hides the label handle depending on the label
    let lab = this.graph.getLabel(cell);
    this.labelShape.visible = (lab != null && lab.length > 0 && this.graph.isLabelMovable(cell));

    if (this.bends != null && this.bends.length > 0) {
      let n = this.abspoints.length - 1;

      var p0 = this.abspoints[0];
      var x0 = p0.x;
      var y0 = p0.y;

      b = this.bends[0].bounds;
      this.bends[0].bounds = new mxRectangle(Math.floor(x0 - b.width / 2),
          Math.floor(y0 - b.height / 2), b.width, b.height);
      this.bends[0].fill = this.getHandleFillColor(0);
      this.bends[0].redraw();

      if (this.manageLabelHandle) {
        this.checkLabelHandle(this.bends[0].bounds);
      }

      let pe = this.abspoints[n];
      let xn = pe.x;
      let yn = pe.y;

      let bn = this.bends.length - 1;
      b = this.bends[bn].bounds;
      this.bends[bn].bounds = new mxRectangle(Math.floor(xn - b.width / 2),
          Math.floor(yn - b.height / 2), b.width, b.height);
      this.bends[bn].fill = this.getHandleFillColor(bn);
      this.bends[bn].redraw();

      if (this.manageLabelHandle) {
        this.checkLabelHandle(this.bends[bn].bounds);
      }

      this.redrawInnerBends(p0, pe);
    }

    if (this.abspoints != null && this.virtualBends != null && this.virtualBends.length > 0) {
      let last = this.abspoints[0];

      for (let i = 0; i < this.virtualBends.length; i++) {
        if (this.virtualBends[i] != null && this.abspoints[i + 1] != null) {
          let pt = this.abspoints[i + 1];
          let b = this.virtualBends[i];
          let x = last.x + (pt.x - last.x) / 2;
          let y = last.y + (pt.y - last.y) / 2;
          b.bounds = new mxRectangle(Math.floor(x - b.bounds.width / 2),
              Math.floor(y - b.bounds.height / 2), b.bounds.width, b.bounds.height);
          b.redraw();
          mxUtils.setOpacity(b.node, this.virtualBendOpacity);
          last = pt;

          if (this.manageLabelHandle) {
            this.checkLabelHandle(b.bounds);
          }
        }
      }
    }

    if (this.labelShape != null) {
      this.labelShape.redraw();
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        let temp = this.customHandles[i].shape.node.style.display;
        this.customHandles[i].redraw();
        this.customHandles[i].shape.node.style.display = temp;

        // Hides custom handles during text editing
        this.customHandles[i].shape.node.style.visibility =
            (this.isCustomHandleVisible(this.customHandles[i])) ?
                '' : 'hidden';
      }
    }
  };

  /**
   * Function: isCustomHandleVisible
   *
   * Returns true if the given custom handle is visible.
   */
  isCustomHandleVisible = (handle) => {
    return !this.graph.isEditing() && this.state.view.graph.getSelectionCount() === 1;
  };

  /**
   * Function: hideHandles
   *
   * Shortcut to <hideSizers>.
   */
  setHandlesVisible = (visible) => {
    if (this.bends != null) {
      for (let i = 0; i < this.bends.length; i++) {
        this.bends[i].node.style.display = (visible) ? '' : 'none';
      }
    }

    if (this.virtualBends != null) {
      for (let i = 0; i < this.virtualBends.length; i++) {
        this.virtualBends[i].node.style.display = (visible) ? '' : 'none';
      }
    }

    if (this.labelShape != null) {
      this.labelShape.node.style.display = (visible) ? '' : 'none';
    }

    if (this.customHandles != null) {
      for (let i = 0; i < this.customHandles.length; i++) {
        this.customHandles[i].setVisible(visible);
      }
    }
  };

  /**
   * Function: redrawInnerBends
   *
   * Updates and redraws the inner bends.
   *
   * Parameters:
   *
   * p0 - <mxPoint> that represents the location of the first point.
   * pe - <mxPoint> that represents the location of the last point.
   */
  redrawInnerBends = (p0, pe) => {
    for (let i = 1; i < this.bends.length - 1; i++) {
      if (this.bends[i] != null) {
        if (this.abspoints[i] != null) {
          let x = this.abspoints[i].x;
          let y = this.abspoints[i].y;

          let b = this.bends[i].bounds;
          this.bends[i].node.style.visibility = 'visible';
          this.bends[i].bounds = new mxRectangle(Math.round(x - b.width / 2),
              Math.round(y - b.height / 2), b.width, b.height);

          if (this.manageLabelHandle) {
            this.checkLabelHandle(this.bends[i].bounds);
          } else if (this.handleImage == null && this.labelShape.visible && mxUtils.intersects(this.bends[i].bounds, this.labelShape.bounds)) {
            w = mxConstants.HANDLE_SIZE + 3;
            h = mxConstants.HANDLE_SIZE + 3;
            this.bends[i].bounds = new mxRectangle(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
          }

          this.bends[i].redraw();
        } else {
          this.bends[i].destroy();
          this.bends[i] = null;
        }
      }
    }
  };

  /**
   * Function: checkLabelHandle
   *
   * Checks if the label handle intersects the given bounds and moves it if it
   * intersects.
   */
  checkLabelHandle = (b) => {
    if (this.labelShape != null) {
      var b2 = this.labelShape.bounds;

      if (mxUtils.intersects(b, b2)) {
        if (b.getCenterY() < b2.getCenterY()) {
          b2.y = b.y + b.height;
        } else {
          b2.y = b.y - b2.height;
        }
      }
    }
  };

  /**
   * Function: drawPreview
   *
   * Redraws the preview.
   */
  drawPreview = () => {
    try {
      if (this.isLabel) {
        let b = this.labelShape.bounds;
        let bounds = new mxRectangle(Math.round(this.label.x - b.width / 2),
            Math.round(this.label.y - b.height / 2), b.width, b.height);

        if (!this.labelShape.bounds.equals(bounds)) {
          this.labelShape.bounds = bounds;
          this.labelShape.redraw();
        }
      }

      if (this.shape != null && !mxUtils.equalPoints(this.shape.points, this.abspoints)) {
        this.shape.apply(this.state);
        this.shape.points = this.abspoints.slice();
        this.shape.scale = this.state.view.scale;
        this.shape.isDashed = this.isSelectionDashed();
        this.shape.stroke = this.getSelectionColor();
        this.shape.strokewidth = this.getSelectionStrokeWidth() / this.shape.scale / this.shape.scale;
        this.shape.isShadow = false;
        this.shape.redraw();
      }

      this.updateParentHighlight();
    } catch (e) {
      // ignore
    }
  };

  /**
   * Function: refresh
   *
   * Refreshes the bends of this handler.
   */
  refresh = () => {
    if (this.state != null) {
      this.abspoints = this.getSelectionPoints(this.state);
      this.points = [];

      if (this.bends != null) {
        this.destroyBends(this.bends);
        this.bends = this.createBends();
      }

      if (this.virtualBends != null) {
        this.destroyBends(this.virtualBends);
        this.virtualBends = this.createVirtualBends();
      }

      if (this.customHandles != null) {
        this.destroyBends(this.customHandles);
        this.customHandles = this.createCustomHandles();
      }

      // Puts label node on top of bends
      if (this.labelShape != null && this.labelShape.node != null && this.labelShape.node.parentNode != null) {
        this.labelShape.node.parentNode.appendChild(this.labelShape.node);
      }
    }
  };

  /**
   * Function: isDestroyed
   *
   * Returns true if <destroy> was called.
   */
  isDestroyed = () => {
    return this.shape == null;
  };

  /**
   * Function: destroyBends
   *
   * Destroys all elements in <bends>.
   */
  destroyBends = (bends) => {
    if (bends != null) {
      for (let i = 0; i < bends.length; i++) {
        if (bends[i] != null) {
          bends[i].destroy();
        }
      }
    }
  };

  /**
   * Function: destroy
   *
   * Destroys the handler and all its resources and DOM nodes. This does
   * normally not need to be called as handlers are destroyed automatically
   * when the corresponding cell is deselected.
   */
  destroy = () => {
    if (this.escapeHandler != null) {
      this.state.view.graph.removeListener(this.escapeHandler);
      this.escapeHandler = null;
    }

    if (this.marker != null) {
      this.marker.destroy();
      this.marker = null;
    }

    if (this.shape != null) {
      this.shape.destroy();
      this.shape = null;
    }

    if (this.parentHighlight != null) {
      let parent = this.graph.model.getParent(this.state.cell);
      let pstate = this.graph.view.getState(parent);

      if (pstate != null && pstate.parentHighlight === this.parentHighlight) {
        pstate.parentHighlight = null;
      }

      this.parentHighlight.destroy();
      this.parentHighlight = null;
    }

    if (this.labelShape != null) {
      this.labelShape.destroy();
      this.labelShape = null;
    }

    if (this.constraintHandler != null) {
      this.constraintHandler.destroy();
      this.constraintHandler = null;
    }

    this.destroyBends(this.virtualBends);
    this.virtualBends = null;

    this.destroyBends(this.customHandles);
    this.customHandles = null;

    this.destroyBends(this.bends);
    this.bends = null;

    this.removeHint();
  };
}

export default mxEdgeHandler;
